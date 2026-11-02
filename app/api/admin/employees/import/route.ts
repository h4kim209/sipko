// app/api/admin/employees/import/route.ts
// POST — Import data guru & pemohon dari file Excel (.xlsx / .xls)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'

function formatPhone(phoneVal: any): string | null {
  if (!phoneVal) return null
  let p = String(phoneVal).trim().replace(/['+\-\s]/g, '')
  if (p.endsWith('.0')) p = p.slice(0, -2)
  p = p.replace(/\D/g, '')
  if (!p) return null
  if (p.startsWith('628')) p = '08' + p.slice(3)
  else if (p.startsWith('62') && !p.startsWith('08')) p = '0' + p.slice(2)
  return p
}

function cleanNip(nipVal: any): string | null {
  if (!nipVal) return null
  let s = String(nipVal).trim()
  if (s.endsWith('.0')) s = s.slice(0, -2)
  if (!s || s === '-') return null
  return s
}

export async function POST(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Berkas Excel wajib diunggah.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'Lembar kerja Excel kosong.' }, { status: 400 })
    }

    const sheet = wb.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris data yang ditemukan di dalam Excel.' }, { status: 400 })
    }

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]

      // Cari kolom nama (fleksibel terhadap nama kolom)
      const nameKey = Object.keys(row).find((k) =>
        /nama/i.test(k) && !/sekolah|ibu|ayah/i.test(k)
      )
      const rawName = nameKey ? row[nameKey] : null
      if (!rawName || String(rawName).trim().length < 2) {
        skippedCount++
        continue
      }

      const name = String(rawName).trim()

      // Cari kolom NIP
      const nipKey = Object.keys(row).find((k) => /nip/i.test(k))
      const nip = cleanNip(nipKey ? row[nipKey] : null)

      // Cari kolom Pangkat/Golongan
      const pangkatKey = Object.keys(row).find((k) => /pangkat|gol/i.test(k))
      const pangkatGol = pangkatKey && row[pangkatKey] && row[pangkatKey] !== '-' ? String(row[pangkatKey]).trim() : null

      // Cari kolom Jabatan
      const jabatanKey = Object.keys(row).find((k) => /jabatan|tugas/i.test(k))
      const jabatan = jabatanKey && row[jabatanKey] ? String(row[jabatanKey]).trim() : 'Guru / Tendik'

      // Cari kolom Unit
      const unitKey = Object.keys(row).find((k) => /unit|bagian|jurusan/i.test(k))
      const unit = unitKey && row[unitKey] ? String(row[unitKey]).trim() : 'SMK Negeri 1 Subang'

      // Cari kolom No. WhatsApp / HP
      const phoneKey = Object.keys(row).find((k) => /wa|whatsapp|hp|telepon|telp|phone/i.test(k))
      const phoneWa = formatPhone(phoneKey ? row[phoneKey] : null)

      // Cek apakah sudah ada di database berdasarkan NIP atau Nama
      let existing = null
      if (nip) {
        existing = await prisma.employee.findFirst({
          where: { nip, deletedAt: null },
        })
      }
      if (!existing) {
        existing = await prisma.employee.findFirst({
          where: { name, deletedAt: null },
        })
      }

      if (existing) {
        await prisma.employee.update({
          where: { id: existing.id },
          data: {
            name,
            nip: nip || existing.nip,
            pangkatGol: pangkatGol || existing.pangkatGol,
            jabatan: jabatan || existing.jabatan,
            unit: unit || existing.unit,
            phoneWa: phoneWa || existing.phoneWa,
            isActive: true,
          },
        })
        updatedCount++
      } else {
        await prisma.employee.create({
          data: {
            name,
            nip,
            pangkatGol,
            jabatan,
            unit,
            phoneWa,
            isActive: true,
          },
        })
        importedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses Excel: ${importedCount} data baru ditambahkan, ${updatedCount} data diperbarui, ${skippedCount} baris diabaikan.`,
      importedCount,
      updatedCount,
      skippedCount,
      errors,
    })
  } catch (err: any) {
    console.error('[Employee Import Error]', err)
    return NextResponse.json({ error: 'Gagal memproses berkas Excel: ' + (err.message || 'Format tidak valid') }, { status: 500 })
  }
}
