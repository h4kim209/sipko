// src/adapters/whatsapp/whatsapp-bot-handler.ts
// Handler interaktif pesan masuk WhatsApp untuk persetujuan cepat (Kepala Sekolah / Tim Manajemen)

import { prisma } from '@/lib/prisma'
import { normalizePhone, jidToPhoneMap } from './baileys-adapter'
import { processBookingApproval, cancelBooking, formatWaDate } from '@/lib/booking-approval-service'

// Cache untuk mendeteksi & mencegah duplikasi pesan yang diproses ulang
const processedMessageIds = new Set<string>()

function recordProcessedMessage(id: string): boolean {
  if (processedMessageIds.has(id)) {
    return true
  }
  processedMessageIds.add(id)
  if (processedMessageIds.size > 2000) {
    const iter = processedMessageIds.values()
    for (let i = 0; i < 500; i++) {
      const v = iter.next().value
      if (v) processedMessageIds.delete(v)
    }
  }
  return false
}

export async function handleIncomingWhatsAppMessage(sock: any, upsert: any): Promise<void> {
  const { messages, type } = upsert
  if (type !== 'notify' && type !== 'append') return
  if (!Array.isArray(messages) || messages.length === 0) return

  for (const msg of messages) {
    try {
      if (!msg?.message || msg.key?.fromMe) continue

      const remoteJid: string = msg.key?.remoteJid || ''
      if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
        continue
      }

      // Hindari duplikasi proses
      const msgId = msg.key?.id
      if (msgId && recordProcessedMessage(msgId)) {
        continue
      }

      // Abaikan pesan usang (> 2 menit) saat bot baru tersambung kembali
      const msgTime =
        typeof msg.messageTimestamp === 'number'
          ? msg.messageTimestamp * 1000
          : typeof msg.messageTimestamp?.toNumber === 'function'
          ? msg.messageTimestamp.toNumber() * 1000
          : Date.now()

      if (Date.now() - msgTime > 120_000) {
        continue
      }

      // Ambil teks pesan
      const rawText: string = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.templateButtonReplyMessage?.selectedId ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        ''
      ).trim()

      if (!rawText) continue

      // Normalisasi nomor pengirim
      const rawNumber = remoteJid.split('@')[0]
      let cleanSender = normalizePhone(rawNumber)

      // 1. Cek dari jidToPhoneMap (pemetaan in-memory dari notifikasi yang baru dikirim ke approver)
      const cachedPhone = jidToPhoneMap.get(remoteJid) || jidToPhoneMap.get(rawNumber)
      if (cachedPhone) {
        cleanSender = cachedPhone
      }

      // 2. Jika JID berakhiran @lid, coba ambil nomor asli via Baileys Signal Repository LID mapping
      if (remoteJid.endsWith('@lid')) {
        try {
          const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(remoteJid)
          if (pn) {
            cleanSender = normalizePhone(pn.split('@')[0])
            jidToPhoneMap.set(remoteJid, cleanSender)
            jidToPhoneMap.set(rawNumber, cleanSender)
            console.log(`[WA Bot] LID ${remoteJid} berhasil di-resolve ke nomor HP: ${cleanSender}`)
          }
        } catch (e) {
          console.warn('[WA Bot] Gagal getPNForLID:', e)
        }
      }

      console.log(`[WA Bot] Pesan masuk dari ${cleanSender} (raw: ${remoteJid}): "${rawText}"`)

      // Helper untuk membalas pesan (quote chat)
      const reply = async (text: string) => {
        try {
          await sock.sendMessage(remoteJid, { text }, { quoted: msg })
        } catch (err) {
          console.error(`[WA Bot] Gagal mengirim pesan balasan ke ${remoteJid}:`, err)
        }
      }

      // 3. Cari user pejabat penyetuju di database
      let approver = await prisma.user.findFirst({
        where: {
          phoneWa: {
            in: [
              cleanSender,
              '0' + cleanSender.slice(2),
              '+' + cleanSender,
              '+62' + cleanSender.slice(2),
              rawNumber,
            ],
          },
          role: { in: ['APPROVER', 'SUPER_ADMIN', 'ADMIN'] },
          isActive: true,
          deletedAt: null,
        },
      })

      // 4. Fallback: Cari di semua user pejabat penyetuju aktif
      if (!approver) {
        const candidates = await prisma.user.findMany({
          where: {
            role: { in: ['APPROVER', 'SUPER_ADMIN', 'ADMIN'] },
            isActive: true,
            deletedAt: null,
            phoneWa: { not: null },
          },
        })
        approver =
          candidates.find((u) => {
            if (!u.phoneWa) return false
            const norm = normalizePhone(u.phoneWa)
            return norm === cleanSender || u.phoneWa.includes(cleanSender) || cleanSender.includes(norm)
          }) || null
      }

      // 5. Fallback Cerdas untuk @lid: Jika pesan berasal dari @lid dan ada pengajuan yang menunggu persetujuan
      if (!approver && remoteJid.endsWith('@lid')) {
        // Ambil notifikasi persetujuan terakhir yang dikirim ke approver dalam 48 jam terakhir
        const recentNotif = await prisma.notification.findFirst({
          where: {
            eventType: 'BOOKING_CREATED_ADMIN',
            status: 'SENT',
            createdAt: { gte: new Date(Date.now() - 48 * 3600 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (recentNotif && recentNotif.recipientPhone) {
          const normRecip = normalizePhone(recentNotif.recipientPhone)
          const matchedUser = await prisma.user.findFirst({
            where: {
              phoneWa: {
                in: [normRecip, '0' + normRecip.slice(2), '+' + normRecip, recentNotif.recipientPhone],
              },
              role: { in: ['APPROVER', 'SUPER_ADMIN', 'ADMIN'] },
              isActive: true,
              deletedAt: null,
            },
          })

          if (matchedUser) {
            approver = matchedUser
            jidToPhoneMap.set(remoteJid, normalizePhone(matchedUser.phoneWa || normRecip))
            jidToPhoneMap.set(rawNumber, normalizePhone(matchedUser.phoneWa || normRecip))
            console.log(
              `[WA Bot] Berhasil memetakan @lid ${remoteJid} ke Pejabat Penyetuju "${matchedUser.name}" via notifikasi terakhir`
            )
          }
        }
      }

      // Jika pengirim BUKAN pejabat penyetuju / admin, abaikan sepenuhnya (SILENT MODE)
      if (!approver) {
        continue
      }

      // Pengirim terotentikasi sebagai Pejabat Penyetuju (Kepsek / Admin)
      await processApproverCommand(approver, rawText, reply)
    } catch (msgErr) {
      console.error('[WA Bot Message Processing Error]', msgErr)
    }
  }
}

async function processApproverCommand(
  approver: { id: string; name: string | null; role: string },
  text: string,
  reply: (text: string) => Promise<void>
) {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()

  // 1. Ekstrak kode booking jika disebutkan eksplisit dalam teks (contoh: SIP-2Z6C9YRZ)
  const bookingCodeMatch = text.match(/\b(SIP-[A-Za-z0-9]+)\b/i)
  const explicitBookingCode = bookingCodeMatch ? bookingCodeMatch[1].toUpperCase() : null

  // 2. Klasifikasi intensi perintah
  let intention: 'APPROVE' | 'REJECT' | 'STATUS' | 'HELP' | 'CANCEL' | 'UNKNOWN' = 'UNKNOWN'
  let rejectionReason: string | null = null
  let cancelReason: string | null = null

  if (
    ['status', 'cek', 'info', 'list', 'antrian', 'daftar', 'pengajuan'].includes(lower) ||
    lower.startsWith('status ') ||
    lower.startsWith('cek ') ||
    lower.startsWith('info ')
  ) {
    intention = 'STATUS'
  } else if (['bantuan', 'help', 'menu', 'panduan'].includes(lower) || lower === '/help' || lower === '/menu') {
    intention = 'HELP'
  } else if (
    lower === 'batal' ||
    lower.startsWith('batal ') ||
    lower.startsWith('batal-') ||
    lower.startsWith('batal:') ||
    lower === 'cancel' ||
    lower.startsWith('cancel ') ||
    lower.startsWith('cancel-') ||
    lower.startsWith('cancel:')
  ) {
    intention = 'CANCEL'
    let remainder = trimmed
    remainder = remainder.replace(/^(batal[\s\-:]*|cancel[\s\-:]*)/i, '').trim()
    if (explicitBookingCode) {
      remainder = remainder.replace(new RegExp(explicitBookingCode, 'i'), '').trim()
    }
    remainder = remainder.replace(/^[\-:,]\s*/, '').trim()
    cancelReason = remainder || null
  } else if (
    lower === '1' ||
    lower.startsWith('1 ') ||
    lower.startsWith('1.') ||
    lower.startsWith('1-') ||
    lower.startsWith('setuju') ||
    lower.startsWith('acc') ||
    lower.startsWith('approve') ||
    lower === 'ya' ||
    lower === 'oke' ||
    lower === 'ok'
  ) {
    intention = 'APPROVE'
  } else if (
    lower === '2' ||
    lower.startsWith('2 ') ||
    lower.startsWith('2.') ||
    lower.startsWith('2-') ||
    lower.startsWith('tolak') ||
    lower.startsWith('reject') ||
    lower.startsWith('tidak')
  ) {
    intention = 'REJECT'

    // Ekstrak alasan: hapus awalan angka 2 / tolak dan kode booking jika ada
    let remainder = trimmed
    remainder = remainder.replace(/^(2[\.\s\-:]*|tolak[\s\-:]*|reject[\s\-:]*|tidak[\s\-:]*)/i, '').trim()

    if (explicitBookingCode) {
      remainder = remainder.replace(new RegExp(explicitBookingCode, 'i'), '').trim()
    }

    remainder = remainder.replace(/^[\-:,]\s*/, '').trim()
    rejectionReason = remainder || null
  }

  // 3. Ambil daftar booking yang saat ini sedang menunggu persetujuan
  const pendingBookings = await prisma.booking.findMany({
    where: {
      status: 'MENUNGGU_PERSETUJUAN',
      deletedAt: null,
    },
    include: {
      vehicle: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // JIKA PERINTAH STATUS
  if (intention === 'STATUS') {
    if (pendingBookings.length === 0) {
      await reply(
        `📋 *STATUS SIPKO SMKN 1 SUBANG*\n\n` +
        `Yth. Bapak/Ibu *${approver.name || 'Pejabat Penyetuju'}*,\n` +
        `Saat ini *TIDAK ADA* pengajuan peminjaman kendaraan yang menunggu persetujuan. Semua pengajuan telah diproses.\n\n` +
        `Dashboard Web: ${process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'}/admin/pengajuan`
      )
      return
    }

    const listText = pendingBookings
      .map(
        (b, idx) =>
          `${idx + 1}. 🔖 *${b.bookingCode}*\n` +
          `   👤 Pemohon: ${b.applicantName} (${b.applicantJabatan})\n` +
          `   📍 Tujuan: ${b.destinationName}\n` +
          `   📅 Berangkat: ${formatWaDate(b.departureDatetime)}\n` +
          `   📅 Kembali: ${formatWaDate(b.returnDatetime)}\n` +
          `   🚙 Kendaraan: ${b.vehicle ? `${b.vehicle.name} (${b.vehicle.plateNumber})` : 'Belum ditentukan'}`
      )
      .join('\n\n')

    await reply(
      `📋 *PENGAJUAN MENUNGGU PERSETUJUAN (${pendingBookings.length})*\n\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ *CARA MEMPROSES CEPAT:*\n` +
      `👉 Balas *1 ${pendingBookings[0].bookingCode}* untuk Setuju\n` +
      `👉 Balas *2 ${pendingBookings[0].bookingCode} [Alasan]* untuk Tolak\n` +
      `━━━━━━━━━━━━━━━━━━━━`
    )
    return
  }

  // JIKA BUKAN PERINTAH RESMI, DIAM (JANGAN BALAS) AGAR TIDAK MENGGANGGU CHAT PRIBADI
  if (intention === 'UNKNOWN') {
    return
  }

  // JIKA PERINTAH BANTUAN SECARA EKSPLISIT DIMINTA (BANTUAN / MENU / PANDUAN)
  if (intention === 'HELP') {
    await reply(
      `*SIPKO — Layanan Persetujuan WhatsApp* 🚗\n` +
      `SMK Negeri 1 Subang\n\n` +
      `Yth. Bapak/Ibu *${approver.name || 'Pejabat Penyetuju'}*,\n` +
      `Anda dapat memproses persetujuan peminjaman kendaraan langsung via pesan WhatsApp ini:\n\n` +
      `📌 *FORMAT BALASAN:*\n` +
      `1️⃣ *1* atau *1 [KODE_BOOKING]*\n` +
      `   Untuk *MENYETUJUI* pengajuan.\n` +
      `   Contoh: *1* atau *1 SIP-ABCD*\n\n` +
      `2️⃣ *2 [Alasan]* atau *2 [KODE_BOOKING] [Alasan]*\n` +
      `   Untuk *MENOLAK* pengajuan (alasan wajib diisi).\n` +
      `   Contoh: *2 Mobil dipakai dinas ke Disdik*\n` +
      `   atau: *2 SIP-ABCD Jadwal bentrok*\n\n` +
      `3️⃣ *BATAL [Alasan]* atau *BATAL [KODE_BOOKING] [Alasan]*\n` +
      `   Untuk *MEMBATALKAN / MENCABUT* persetujuan jika salah balas 1.\n` +
      `   Contoh: *BATAL Salah pencet setuju*\n` +
      `   atau: *BATAL SIP-ABCD Dibatalkan kepala sekolah*\n\n` +
      `4️⃣ *STATUS*\n` +
      `   Melihat daftar pengajuan yang sedang menunggu persetujuan.\n\n` +
      `🌐 Buka web: ${process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'}/admin/pengajuan`
    )
    return
  }

  // JIKA PERINTAH SETUJU (1)
  if (intention === 'APPROVE') {
    let targetCode: string | null = explicitBookingCode

    if (!targetCode) {
      if (pendingBookings.length === 0) {
        await reply(
          `ℹ️ *Tidak Ada Pengajuan Menunggu*\n\n` +
          `Saat ini tidak ada permohonan peminjaman kendaraan yang sedang menunggu persetujuan.`
        )
        return
      }

      if (pendingBookings.length === 1) {
        targetCode = pendingBookings[0].bookingCode
      } else {
        // Lebih dari 1 pengajuan menunggu, minta kepsek tentukan kodenya
        const optionsText = pendingBookings
          .map(
            (b, idx) =>
              `${idx + 1}. *${b.bookingCode}* — ${b.applicantName} (${b.destinationName})\n   📅 ${formatWaDate(b.departureDatetime)}`
          )
          .join('\n\n')

        await reply(
          `⚠️ *Terdapat ${pendingBookings.length} Pengajuan Menunggu Persetujuan:*\n\n` +
          `${optionsText}\n\n` +
          `Mohon tentukan kode booking yang ingin disetujui:\n` +
          `👉 Balas *1 [KODE_BOOKING]*\n` +
          `Contoh: *1 ${pendingBookings[0].bookingCode}*`
        )
        return
      }
    }

    // Eksekusi persetujuan melalui service terpadu
    const result = await processBookingApproval({
      bookingCode: targetCode,
      decision: 'APPROVE',
      actor: approver,
      source: 'WHATSAPP',
    })

    if (!result.success) {
      await reply(`❌ *Persetujuan Gagal*\n\n${result.error || 'Terjadi kendala saat memproses booking.'}`)
      return
    }

    const b = result.booking
    await reply(
      `✅ *PENGAJUAN BERHASIL DISETUJUI*\n\n` +
      `🔖 Kode Booking: *${b.bookingCode}*\n` +
      `👤 Pemohon: ${b.applicantName} (${b.applicantJabatan})\n` +
      `📍 Tujuan: ${b.destinationName}\n` +
      `📅 Berangkat: ${formatWaDate(b.departureDatetime)}\n` +
      `📅 Kembali: ${formatWaDate(b.returnDatetime)}\n` +
      (b.vehicle ? `🚙 Kendaraan: ${b.vehicle.name} (${b.vehicle.plateNumber})\n` : '') +
      `\nNotifikasi resmi persetujuan telah otomatis dikirimkan ke WhatsApp pemohon (${b.applicantPhoneWa}).\n\n` +
      `Terima kasih Bapak/Ibu ${approver.name || 'Pejabat Penyetuju'}. 🙏\n` +
      `SIPKO | SMKN 1 Subang`
    )
    return
  }

  // JIKA PERINTAH TOLAK (2)
  if (intention === 'REJECT') {
    let targetCode: string | null = explicitBookingCode

    if (!targetCode) {
      if (pendingBookings.length === 0) {
        await reply(
          `ℹ️ *Tidak Ada Pengajuan Menunggu*\n\n` +
          `Saat ini tidak ada permohonan peminjaman kendaraan yang sedang menunggu persetujuan.`
        )
        return
      }

      if (pendingBookings.length === 1) {
        targetCode = pendingBookings[0].bookingCode
      } else {
        const optionsText = pendingBookings
          .map(
            (b, idx) =>
              `${idx + 1}. *${b.bookingCode}* — ${b.applicantName} (${b.destinationName})`
          )
          .join('\n')

        await reply(
          `⚠️ *Terdapat ${pendingBookings.length} Pengajuan Menunggu:*\n\n` +
          `${optionsText}\n\n` +
          `Mohon sertakan Kode Booking dan Alasan Penolakan:\n` +
          `👉 Balas: *2 [KODE_BOOKING] [Alasan]*\n` +
          `Contoh: *2 ${pendingBookings[0].bookingCode} ${rejectionReason || 'Mobil dinas sedang diservis'}*`
        )
        return
      }
    }

    // Alasan penolakan wajib
    if (!rejectionReason) {
      const targetBooking = pendingBookings.find((b) => b.bookingCode === targetCode)
      await reply(
        `⚠️ *Alasan Penolakan Wajib Diisi*\n\n` +
        `Mohon sertakan alasan penolakan untuk pengajuan *${targetCode}*${targetBooking ? ` (Pemohon: ${targetBooking.applicantName})` : ''}.\n\n` +
        `Contoh balasan:\n` +
        `👉 *2 Mobil dinas sedang dipakai dinas luar*\n` +
        `atau: *2 ${targetCode} Jadwal bertabrakan dengan agenda sekolah*`
      )
      return
    }

    // Eksekusi penolakan melalui service terpadu
    const result = await processBookingApproval({
      bookingCode: targetCode,
      decision: 'REJECT',
      notes: rejectionReason,
      actor: approver,
      source: 'WHATSAPP',
    })

    if (!result.success) {
      await reply(`❌ *Penolakan Gagal*\n\n${result.error || 'Terjadi kendala saat memproses booking.'}`)
      return
    }

    const b = result.booking
    await reply(
      `❌ *PENGAJUAN TELAH DITOLAK*\n\n` +
      `🔖 Kode Booking: *${b.bookingCode}*\n` +
      `👤 Pemohon: ${b.applicantName} (${b.applicantJabatan})\n` +
      `📍 Tujuan: ${b.destinationName}\n` +
      `📝 Alasan Penolakan: *${rejectionReason}*\n\n` +
      `Notifikasi penolakan beserta alasan telah otomatis dikirimkan ke WhatsApp pemohon (${b.applicantPhoneWa}).\n\n` +
      `SIPKO | SMKN 1 Subang`
    )
    return
  }

  // JIKA PERINTAH BATAL (CANCEL)
  if (intention === 'CANCEL') {
    let targetCode: string | null = explicitBookingCode

    if (!targetCode) {
      // Cari booking yang DISETUJUI atau MENUNGGU_PERSETUJUAN (ambil yang aktif dalam 48 jam)
      const cancellableBookings = await prisma.booking.findMany({
        where: {
          status: { in: ['DISETUJUI', 'MENUNGGU_PEMERIKSAAN_AWAL', 'MENUNGGU_PERSETUJUAN'] },
          deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 48 * 3600 * 1000) },
        },
        include: { vehicle: true },
        orderBy: { updatedAt: 'desc' },
      })

      if (cancellableBookings.length === 0) {
        await reply(
          `ℹ️ *Tidak Ada Pengajuan yang Dapat Dibatalkan*\n\n` +
          `Saat ini tidak ada permohonan peminjaman aktif yang berada dalam status disetujui / menunggu.`
        )
        return
      }

      if (cancellableBookings.length === 1) {
        targetCode = cancellableBookings[0].bookingCode
      } else {
        const optionsText = cancellableBookings
          .map(
            (b, idx) =>
              `${idx + 1}. *${b.bookingCode}* [${b.status}] — ${b.applicantName} (${b.destinationName})`
          )
          .join('\n')

        await reply(
          `⚠️ *Terdapat beberapa pengajuan aktif:*\n\n` +
          `${optionsText}\n\n` +
          `Mohon tentukan kode booking yang ingin dibatalkan:\n` +
          `👉 Balas: *BATAL [KODE_BOOKING] [Alasan]*\n` +
          `Contoh: *BATAL ${cancellableBookings[0].bookingCode} ${cancelReason || 'Salah setujui' }*`
        )
        return
      }
    }

    if (!cancelReason) {
      await reply(
        `⚠️ *Alasan Pembatalan Wajib Diisi*\n\n` +
        `Mohon sertakan alasan pembatalan untuk booking *${targetCode}*.\n\n` +
        `Contoh balasan:\n` +
        `👉 *BATAL ${targetCode} Tidak sengaja membalas 1*\n` +
        `atau: *BATAL ${targetCode} Jadwal dinas mendadak berubah*`
      )
      return
    }

    const result = await cancelBooking({
      bookingCode: targetCode,
      reason: cancelReason,
      actor: approver,
      source: 'WHATSAPP',
    })

    if (!result.success) {
      await reply(`❌ *Pembatalan Gagal*\n\n${result.error || 'Terjadi kendala saat membatalkan booking.'}`)
      return
    }

    const b = result.booking
    await reply(
      `⚠️ *PEMINJAMAN BERHASIL DIBATALKAN*\n\n` +
      `🔖 Kode Booking: *${b.bookingCode}*\n` +
      `👤 Pemohon: ${b.applicantName}\n` +
      `📍 Tujuan: ${b.destinationName}\n` +
      `📝 Alasan: *${cancelReason}*\n\n` +
      `Status peminjaman telah diubah menjadi *DIBATALKAN*.\n` +
      `Notifikasi pembatalan dan pembebasan armada dinas telah otomatis dikirimkan ke WhatsApp pemohon (${b.applicantPhoneWa}). 🙏\n\n` +
      `SIPKO | SMKN 1 Subang`
    )
    return
  }
}
