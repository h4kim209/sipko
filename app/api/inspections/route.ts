// app/api/inspections/route.ts
// POST — Upload bukti pemeriksaan (pre/post) kendaraan

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveFile } from '@/lib/file-storage'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { getWhatsAppAdapter, WA_TEMPLATES } from '@/adapters/whatsapp'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const bookingCode = formData.get('bookingCode') as string
    const inspectionType = formData.get('type') as string // PRE | POST
    const odometer = parseInt(formData.get('odometer') as string)
    const existingDamage = formData.get('existingDamage') as string || ''
    const incidentNotes = formData.get('incidentNotes') as string || ''
    const fuelFilledStr = formData.get('fuelFilled') as string
    const fuelNotes = formData.get('fuelNotes') as string || ''
    const speedometerPhoto = formData.get('speedometerPhoto') as File | null
    const conditionPhotos = formData.getAll('conditionPhotos') as File[]
    const fuelReceiptPhoto = formData.get('fuelReceiptPhoto') as File | null

    // Validasi dasar
    if (!bookingCode || !inspectionType || isNaN(odometer) || odometer < 0) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Kode booking, tipe, dan kilometer wajib diisi.' },
        { status: 400 }
      )
    }

    if (!['PRE', 'POST'].includes(inspectionType)) {
      return NextResponse.json({ error: 'Tipe pemeriksaan tidak valid.' }, { status: 400 })
    }

    // Cari booking
    const booking = await prisma.booking.findFirst({
      where: {
        bookingCode: bookingCode.toUpperCase(),
        deletedAt: null,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan.' }, { status: 404 })
    }

    // Validasi status
    if (inspectionType === 'PRE') {
      if (booking.status !== 'MENUNGGU_PEMERIKSAAN_AWAL') {
        return NextResponse.json(
          { error: 'Status booking tidak memungkinkan upload bukti awal.' },
          { status: 400 }
        )
      }
    } else {
      if (!['SEDANG_DIGUNAKAN', 'PERLU_PERBAIKAN_BUKTI'].includes(booking.status)) {
        return NextResponse.json(
          { error: 'Status booking tidak memungkinkan upload bukti akhir.' },
          { status: 400 }
        )
      }
    }

    // Validasi foto
    if (!speedometerPhoto) {
      return NextResponse.json(
        { error: 'Foto speedometer wajib diunggah.' },
        { status: 400 }
      )
    }

    if (conditionPhotos.length < 3) {
      return NextResponse.json(
        { error: 'Minimal 3 foto kondisi kendaraan wajib diunggah.' },
        { status: 400 }
      )
    }

    // Validasi BBM untuk POST
    if (inspectionType === 'POST') {
      const fuelFilled = fuelFilledStr === 'true'
      if (fuelFilledStr === null || fuelFilledStr === undefined) {
        return NextResponse.json(
          { error: 'Pilih apakah mengisi BBM atau tidak.' },
          { status: 400 }
        )
      }
      if (fuelFilled && !fuelReceiptPhoto) {
        return NextResponse.json(
          { error: 'Foto bukti pengisian BBM wajib jika mengisi BBM.' },
          { status: 400 }
        )
      }
      if (!fuelFilled && !fuelNotes.trim()) {
        return NextResponse.json(
          { error: 'Jelaskan alasan tidak mengisi BBM.' },
          { status: 400 }
        )
      }
    }

    // Validasi semua file
    const allFiles = [speedometerPhoto, ...conditionPhotos, ...(fuelReceiptPhoto ? [fuelReceiptPhoto] : [])]
    for (const file of allFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" melebihi batas ${process.env.MAX_FILE_SIZE_MB || 10} MB.` },
          { status: 400 }
        )
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File "${file.name}" bertipe ${file.type}. Hanya JPG, PNG, WebP yang diizinkan.` },
          { status: 400 }
        )
      }
    }

    // Simpan inspection
    const fuelFilled = inspectionType === 'POST' ? fuelFilledStr === 'true' : null

    // Check for pre-inspection odometer vs vehicle's last odometer
    if (inspectionType === 'POST') {
      const preInspection = await prisma.vehicleInspection.findFirst({
        where: { bookingId: booking.id, type: 'PRE' },
      })
      if (preInspection && preInspection.odometer !== null && odometer < preInspection.odometer) {
        // Allow but flag — don't block
        console.warn(`[Odometer Warning] Booking ${bookingCode}: Odometer akhir (${odometer}) < awal (${preInspection.odometer})`)
      }
    }

    const inspection = await prisma.vehicleInspection.create({
      data: {
        bookingId: booking.id,
        type: inspectionType as 'PRE' | 'POST',
        odometer,
        existingDamage: inspectionType === 'PRE' ? existingDamage : null,
        incidentNotes: inspectionType === 'POST' ? incidentNotes : null,
        fuelFilled,
        fuelNotes: inspectionType === 'POST' ? fuelNotes : null,
        submittedById: booking.userId || 'system',
        submittedAt: new Date(),
      },
    })

    // Upload dan simpan foto
    const subDir = `inspections/${booking.id}/${inspectionType.toLowerCase()}`

    // Foto speedometer
    const speedoBuffer = Buffer.from(await speedometerPhoto.arrayBuffer())
    const speedoStored = await saveFile(speedoBuffer, speedometerPhoto.name, speedometerPhoto.type, subDir)
    await prisma.inspectionPhoto.create({
      data: {
        inspectionId: inspection.id,
        category: inspectionType === 'PRE' ? 'SPEEDOMETER_PRE' : 'SPEEDOMETER_POST',
        filePath: speedoStored.relativePath,
        fileSize: speedoStored.sizeBytes,
        mimeType: speedoStored.mimeType,
        uploadedById: booking.userId || 'system',
      },
    })

    // Foto kondisi
    const conditionCategories = inspectionType === 'PRE'
      ? ['INTERIOR_FRONT_PRE', 'SEAT_REAR_PRE', 'EXTERIOR_PRE']
      : ['INTERIOR_FRONT_POST', 'SEAT_REAR_POST', 'EXTERIOR_POST']

    for (let i = 0; i < conditionPhotos.length; i++) {
      const file = conditionPhotos[i]
      const buffer = Buffer.from(await file.arrayBuffer())
      const stored = await saveFile(buffer, file.name, file.type, subDir)
      await prisma.inspectionPhoto.create({
        data: {
          inspectionId: inspection.id,
          category: (conditionCategories[i] || 'OTHER') as any,
          filePath: stored.relativePath,
          fileSize: stored.sizeBytes,
          mimeType: stored.mimeType,
          uploadedById: booking.userId || 'system',
        },
      })
    }

    // Foto BBM receipt
    if (fuelReceiptPhoto) {
      const fuelBuffer = Buffer.from(await fuelReceiptPhoto.arrayBuffer())
      const fuelStored = await saveFile(fuelBuffer, fuelReceiptPhoto.name, fuelReceiptPhoto.type, subDir)
      await prisma.inspectionPhoto.create({
        data: {
          inspectionId: inspection.id,
          category: 'FUEL_RECEIPT',
          filePath: fuelStored.relativePath,
          fileSize: fuelStored.sizeBytes,
          mimeType: fuelStored.mimeType,
          uploadedById: booking.userId || 'system',
        },
      })
    }

    // Update status booking
    if (inspectionType === 'PRE') {
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'SIAP_BERANGKAT' },
        }),
        prisma.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            actorName: booking.applicantName,
            fromStatus: 'MENUNGGU_PEMERIKSAAN_AWAL',
            toStatus: 'SIAP_BERANGKAT',
            notes: 'Bukti pemeriksaan awal diunggah.',
          },
        }),
      ])
    } else {
      const newStatus = 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN'
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: newStatus,
            actualReturnAt: new Date(),
          },
        }),
        prisma.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            actorName: booking.applicantName,
            fromStatus: booking.status,
            toStatus: newStatus,
            notes: 'Bukti pengembalian diunggah oleh pemohon.',
          },
        }),
      ])

      // Notifikasi WA ke admin: bukti pengembalian masuk
      try {
        const preInspection = await prisma.vehicleInspection.findFirst({
          where: { bookingId: booking.id, type: 'PRE' },
        })

        const wa = getWhatsAppAdapter()
        const adminNumbers = (process.env.WA_ADMIN_NUMBERS || '').split(',').filter(Boolean)
        const appUrl = process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'

        for (const adminPhone of adminNumbers) {
          const msg = WA_TEMPLATES.returnEvidenceReceived({
            nama: booking.applicantName,
            kode_booking: booking.bookingCode,
            tujuan: booking.destinationName,
            km_awal: preInspection?.odometer?.toString() || '-',
            km_akhir: odometer.toString(),
            km_aktual: preInspection?.odometer
              ? (odometer - preInspection.odometer).toString()
              : '-',
            app_url: appUrl,
          })

          await prisma.notification.create({
            data: {
              bookingId: booking.id,
              recipientPhone: adminPhone.trim(),
              eventType: 'RETURN_EVIDENCE_RECEIVED',
              messageBody: msg,
              status: 'QUEUED',
            },
          })

          const result = await wa.sendMessage(adminPhone.trim(), msg)
          await prisma.notification.updateMany({
            where: {
              bookingId: booking.id,
              eventType: 'RETURN_EVIDENCE_RECEIVED',
              recipientPhone: adminPhone.trim(),
            },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              providerMessageId: result.providerMessageId,
              attemptCount: 1,
              lastAttemptAt: new Date(),
              errorMessage: result.error,
            },
          })
        }
      } catch (waErr) {
        console.error('[WA Return Evidence Error]', waErr)
      }
    }

    // Audit log
    await writeAuditLog({
      action: AUDIT_ACTIONS.INSPECTION_SUBMITTED,
      entityType: 'inspection',
      entityId: inspection.id,
      actorName: booking.applicantName,
      newValue: {
        type: inspectionType,
        odometer,
        photoCount: allFiles.length,
      },
    })

    return NextResponse.json({
      success: true,
      message: inspectionType === 'PRE'
        ? 'Bukti pemeriksaan awal berhasil diunggah.'
        : 'Bukti pengembalian berhasil diunggah.',
    })
  } catch (err: any) {
    console.error('[Inspection Upload Error]', err)
    return NextResponse.json(
      { error: 'Gagal mengunggah bukti. ' + (err.message || '') },
      { status: 500 }
    )
  }
}
