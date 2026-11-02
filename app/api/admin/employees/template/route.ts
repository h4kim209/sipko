// app/api/admin/employees/template/route.ts
// GET — Download template Excel untuk import data guru & pemohon SIPKO

import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  const type = request.nextUrl.searchParams.get('type') || 'blank'

  // Jika admin meminta file data lengkap yang telah diakurkan:
  if (type === 'full') {
    const uploadFilePath = path.join(process.cwd(), 'data guru', 'DAFTAR_GURU_TENDIK_SIPKO_UPLOAD.xlsx')
    const fallbackPath = path.join(process.cwd(), 'data guru', 'DAFTAR_GURU_TENDIK_LENGKAP.xlsx')
    try {
      const fileBuffer = await fs.readFile(uploadFilePath).catch(() => fs.readFile(fallbackPath))
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="DAFTAR_GURU_TENDIK_SMKN1SUBANG_UPLOAD.xlsx"',
        },
      })
    } catch {
      // Fallback lanjut ke pembuatan template jika file tidak ditemukan
    }
  }

  // Buat workbook template baru
  const wb = XLSX.utils.book_new()

  const sampleData = [
    {
      'No': 1,
      'Nama Lengkap*': 'Dra. Hj. Mulya Rohati',
      'NIP': '19670316 199203 2 003',
      'Pangkat / Golongan': 'Pembina Utama Muda (IV/c)',
      'Jabatan': 'Guru Ahli Madya',
      'Unit Kerja': 'SMK Negeri 1 Subang',
      'Nomor WhatsApp': '082240280593',
      'Status': 'Aktif',
    },
    {
      'No': 2,
      'Nama Lengkap*': 'H. Saepul Palah, M. Ag',
      'NIP': '19730119 199903 1 002',
      'Pangkat / Golongan': 'Pembina Utama Muda (IV/c)',
      'Jabatan': 'Guru Ahli Madya',
      'Unit Kerja': 'SMK Negeri 1 Subang',
      'Nomor WhatsApp': '08122185645',
      'Status': 'Aktif',
    },
    {
      'No': 3,
      'Nama Lengkap*': 'Contoh Staf TU Baru',
      'NIP': '',
      'Pangkat / Golongan': '-',
      'Jabatan': 'Staf Tata Usaha',
      'Unit Kerja': 'SMK Negeri 1 Subang',
      'Nomor WhatsApp': '085712345678',
      'Status': 'Aktif',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData)

  ws['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 24 },
    { wch: 28 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Template Guru & Tendik')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-import-guru-sipko.xlsx"',
    },
  })
}
