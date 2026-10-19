// app/api/admin/reports/export/route.ts
// GET — Export booking data to Excel/PDF

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  const format = request.nextUrl.searchParams.get('format') || 'xlsx'

  const bookings = await prisma.booking.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { select: { name: true, plateNumber: true } },
    },
  })

  const rows = bookings.map((b, i) => ({
    'No': i + 1,
    'Kode Booking': b.bookingCode,
    'Pemohon': b.applicantName,
    'NIP': b.applicantNip || '-',
    'Jabatan': b.applicantJabatan,
    'Unit': b.applicantUnit || '-',
    'No. WhatsApp': b.applicantPhoneWa,
    'Kendaraan': b.vehicle.name,
    'Nomor Polisi': b.vehicle.plateNumber,
    'Tujuan': b.destinationName,
    'Alamat Tujuan': b.destinationAddress,
    'Keperluan': b.purposeCategory,
    'Keterangan': b.purposeNotes || '-',
    'Estimasi Jarak (km)': b.routeDistanceKm || '-',
    'Waktu Berangkat': b.departureDatetime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    'Waktu Kembali': b.returnDatetime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    'Berangkat Aktual': b.actualDepartureAt ? b.actualDepartureAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-',
    'Kembali Aktual': b.actualReturnAt ? b.actualReturnAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-',
    'Status': b.status,
    'Tanggal Dibuat': b.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
  }))

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 18 },
      { wch: 15 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 25 },
      { wch: 35 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 22 },
      { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 22 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Peminjaman')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=laporan-sipko-${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
    })
  }

  // PDF fallback: generate simple HTML table → user can print
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan SIPKO — SMKN 1 Subang</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    h2 { font-size: 12px; color: #666; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #0d9488; color: white; font-size: 9px; }
    td { font-size: 9px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>LAPORAN PEMINJAMAN KENDARAAN OPERASIONAL</h1>
  <h2>SIPKO — SMKN 1 Subang | Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</h2>
  <table>
    <thead><tr>${Object.keys(rows[0] || {}).map(k => `<th>${k}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${Object.values(r).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
