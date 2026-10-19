// app/api/admin/reports/export/route.ts
// GET — Export booking data to Excel/PDF

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUS_LABELS: Record<string, string> = {
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  MENUNGGU_PEMERIKSAAN_AWAL: 'Pemeriksaan Awal',
  SIAP_BERANGKAT: 'Siap Berangkat',
  SEDANG_DIGUNAKAN: 'Sedang Digunakan',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: 'Pem. Pengembalian',
  PERLU_PERBAIKAN_BUKTI: 'Perlu Perbaikan',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
}

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

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    'Waktu Berangkat': formatDate(b.departureDatetime),
    'Waktu Kembali': formatDate(b.returnDatetime),
    'Berangkat Aktual': b.actualDepartureAt ? formatDate(b.actualDepartureAt) : '-',
    'Kembali Aktual': b.actualReturnAt ? formatDate(b.actualReturnAt) : '-',
    'Status': STATUS_LABELS[b.status] || b.status,
    'Tanggal Dibuat': formatDate(b.createdAt),
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

  if (format === 'pdf') {
    // Buat dokumen PDF Landscape A4 resmi
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' })
    const nowStr = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Header Kop Surat
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('SMK NEGERI 1 SUBANG', 148.5, 14, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(13, 148, 136) // Warna Teal SIPKO
    doc.text('LAPORAN DATA PEMINJAMAN KENDARAAN OPERASIONAL (SIPKO)', 148.5, 20, { align: 'center' })

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Waktu Cetak: ${nowStr} WIB | Total Data: ${bookings.length} Peminjaman`, 148.5, 25, { align: 'center' })

    // Garis Pemisah
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.5)
    doc.line(14, 28, 283, 28)

    // Data Baris untuk Tabel PDF
    const tableBody = bookings.map((b, i) => [
      String(i + 1),
      b.bookingCode,
      b.applicantName,
      `${b.applicantJabatan || '-'}\n(${b.applicantUnit || '-'})`,
      `${b.vehicle.name}\n(${b.vehicle.plateNumber})`,
      `${b.destinationName}\n${b.purposeCategory}`,
      formatDate(b.departureDatetime),
      formatDate(b.returnDatetime),
      STATUS_LABELS[b.status] || b.status,
    ])

    autoTable(doc, {
      startY: 32,
      margin: { left: 14, right: 14, bottom: 15 },
      head: [['No', 'Kode', 'Pemohon', 'Jabatan / Unit', 'Kendaraan', 'Tujuan / Keperluan', 'Waktu Berangkat', 'Waktu Kembali', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [13, 148, 136], // Primary Teal
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'top',
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26, fontStyle: 'bold', halign: 'center' },
        2: { cellWidth: 32 },
        3: { cellWidth: 30 },
        4: { cellWidth: 36 },
        5: { cellWidth: 44 },
        6: { cellWidth: 30, halign: 'center' },
        7: { cellWidth: 30, halign: 'center' },
        8: { cellWidth: 24, halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    })

    // Footer Nomor Halaman
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Halaman ${i} dari ${totalPages} — Dokumen Resmi SIPKO SMKN 1 Subang`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 8,
        { align: 'center' }
      )
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=laporan-sipko-${new Date().toISOString().slice(0, 10)}.pdf`,
      },
    })
  }

  // Fallback HTML untuk preview cetak jika diminta format=html
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
