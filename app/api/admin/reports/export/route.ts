// app/api/admin/reports/export/route.ts
// GET — Export booking data to Excel/PDF with Manifesting & Photo Attachments

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { readFile } from '@/lib/file-storage'
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

const PHOTO_CATEGORY_LABELS: Record<string, string> = {
  SPEEDOMETER_PRE: 'Speedometer Awal',
  SPEEDOMETER_POST: 'Speedometer Akhir',
  INTERIOR_FRONT_PRE: 'Interior Depan (Awal)',
  INTERIOR_FRONT_POST: 'Interior Depan (Akhir)',
  SEAT_REAR_PRE: 'Jok Belakang (Awal)',
  SEAT_REAR_POST: 'Jok Belakang (Akhir)',
  EXTERIOR_PRE: 'Eksterior (Awal)',
  EXTERIOR_POST: 'Eksterior (Akhir)',
  FUEL_RECEIPT: 'Struk BBM',
  OTHER: 'Foto Dokumentasi',
}

async function getPhotoBase64(relativePath: string): Promise<{ data: string; format: 'JPEG' | 'PNG' } | null> {
  try {
    const buffer = await readFile(relativePath)
    let format: 'JPEG' | 'PNG' = 'JPEG'
    if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      format = 'PNG'
    }
    return {
      data: `data:image/${format === 'PNG' ? 'png' : 'jpeg'};base64,${buffer.toString('base64')}`,
      format,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  const format = request.nextUrl.searchParams.get('format') || 'xlsx'

  const bookings = await prisma.booking.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { select: { name: true, plateNumber: true, brand: true, type: true } },
      inspections: {
        include: {
          photos: { where: { isSuperseded: false }, orderBy: { uploadedAt: 'asc' } },
        },
      },
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

  const rows = bookings.map((b, i) => {
    const passengerList = Array.isArray(b.passengers) && (b.passengers as string[]).length > 0
      ? (b.passengers as string[]).join(', ')
      : '-'

    return {
      'No': i + 1,
      'Kode Booking': b.bookingCode,
      'Pemohon': b.applicantName,
      'NIP': b.applicantNip || '-',
      'Jabatan': b.applicantJabatan,
      'Unit': b.applicantUnit || '-',
      'No. WhatsApp': b.applicantPhoneWa,
      'Pengemudi / Supir': b.driverName || b.applicantName,
      'No. HP Supir': b.driverPhone || b.applicantPhoneWa,
      'Penumpang Guru / Tendik': passengerList,
      'Catatan Siswa / Peserta': b.passengerNotes || '-',
      'Total Penumpang': b.passengerCount || 1,
      'Status Dokumen SPPD': b.hasSppd ? (b.sppdPhotoPath ? 'Ada (Foto Terlampir)' : 'Ada') : 'Tidak Ada',
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
    }
  })

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 18 },
      { wch: 15 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 30 },
      { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
      { wch: 25 }, { wch: 35 }, { wch: 20 }, { wch: 30 }, { wch: 10 },
      { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 20 },
      { wch: 22 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Peminjaman')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(new Uint8Array(buffer), {
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
    const tableBody = bookings.map((b, i) => {
      const passengerList = Array.isArray(b.passengers) && (b.passengers as string[]).length > 0
        ? (b.passengers as string[]).join(', ')
        : 'Hanya Pengemudi'

      const manifestingSummary = `Supir: ${b.driverName || b.applicantName}\nIkut: ${passengerList}${b.passengerNotes ? `\nSiswa: ${b.passengerNotes}` : ''}`

      return [
        String(i + 1),
        b.bookingCode,
        `${b.applicantName}\n(${b.applicantPhoneWa})`,
        `${b.vehicle.name}\n(${b.vehicle.plateNumber})`,
        manifestingSummary,
        `${b.destinationName}\n(${b.purposeCategory})`,
        b.hasSppd ? '✅ Ada SPPD' : '⚪ Tanpa SPPD',
        `${formatDate(b.departureDatetime)}\ns.d.\n${formatDate(b.returnDatetime)}`,
        STATUS_LABELS[b.status] || b.status,
      ]
    })

    autoTable(doc, {
      startY: 32,
      margin: { left: 14, right: 14, bottom: 15 },
      head: [['No', 'Kode', 'Pemohon / Kontak', 'Kendaraan', 'Manifesting Armada', 'Tujuan / Acara', 'SPPD', 'Jadwal', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [13, 148, 136], // Primary Teal
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
        valign: 'top',
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, fontStyle: 'bold', halign: 'center' },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 54 },
        5: { cellWidth: 38 },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 34, halign: 'center' },
        8: { cellWidth: 22, halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    })

    // Sesi Lampiran Foto Dokumentasi Perjalanan
    // Kumpulkan booking yang memiliki foto (SPPD atau Inspeksi)
    const bookingsWithPhotos = bookings.filter((b) => {
      const hasSppdPhoto = Boolean(b.hasSppd && b.sppdPhotoPath)
      const hasInspectionPhotos = b.inspections.some((insp) => insp.photos.length > 0)
      return hasSppdPhoto || hasInspectionPhotos
    })

    if (bookingsWithPhotos.length > 0) {
      doc.addPage()
      let currentY = 18

      // Judul Sesi Lampiran
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('LAMPIRAN DOKUMENTASI FOTO PERJALANAN', 148.5, currentY, { align: 'center' })

      currentY += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Dokumentasi Resmi Foto SPPD & Bukti Pemeriksaan Kendaraan (Awal / Pengembalian)', 148.5, currentY, { align: 'center' })

      currentY += 4
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.4)
      doc.line(14, currentY, 283, currentY)
      currentY += 6

      for (const b of bookingsWithPhotos) {
        // Cek sisa halaman jika currentY terlalu dekat ke dasar
        if (currentY > 150) {
          doc.addPage()
          currentY = 20
        }

        // Header Booking
        doc.setFillColor(241, 245, 249)
        doc.rect(14, currentY, 269, 8, 'F')
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42)
        doc.text(
          `Kode: ${b.bookingCode} | Pemohon: ${b.applicantName} | Kendaraan: ${b.vehicle.name} (${b.vehicle.plateNumber}) | Pengemudi: ${b.driverName || b.applicantName}`,
          18,
          currentY + 5.5
        )
        currentY += 12

        // Kumpulkan semua foto untuk booking ini
        type ReportPhoto = { title: string; path: string }
        const photosToRender: ReportPhoto[] = []

        if (b.hasSppd && b.sppdPhotoPath) {
          photosToRender.push({ title: '📄 Foto Dokumen SPPD', path: b.sppdPhotoPath })
        }

        for (const insp of b.inspections) {
          const typePrefix = insp.type === 'PRE' ? '🟢 Awal: ' : '🔵 Kembali: '
          for (const p of insp.photos) {
            photosToRender.push({
              title: `${typePrefix}${PHOTO_CATEGORY_LABELS[p.category] || 'Pemeriksaan'}`,
              path: p.filePath,
            })
          }
        }

        // Render foto dalam grid baris (maksimal 4 foto per baris)
        const photoWidth = 58
        const photoHeight = 44
        const photoGap = 8
        const startX = 14

        let colIdx = 0
        let rowStartY = currentY

        for (const p of photosToRender) {
          if (rowStartY + photoHeight + 14 > 195) {
            doc.addPage()
            rowStartY = 20
            colIdx = 0
          }

          const x = startX + colIdx * (photoWidth + photoGap)

          // Load Base64 Buffer
          const photoData = await getPhotoBase64(p.path)
          if (photoData) {
            try {
              doc.addImage(photoData.data, photoData.format, x, rowStartY, photoWidth, photoHeight)
              // Border foto
              doc.setDrawColor(203, 213, 225)
              doc.rect(x, rowStartY, photoWidth, photoHeight)
            } catch {
              // Jika format tidak didukung jsPDF, render kotak placeholder
              doc.setFillColor(248, 250, 252)
              doc.rect(x, rowStartY, photoWidth, photoHeight, 'F')
              doc.setFontSize(6.5)
              doc.setTextColor(100, 116, 139)
              doc.text('[Foto Terarsip]', x + photoWidth / 2, rowStartY + photoHeight / 2, { align: 'center' })
            }
          } else {
            doc.setFillColor(248, 250, 252)
            doc.rect(x, rowStartY, photoWidth, photoHeight, 'F')
            doc.setFontSize(6.5)
            doc.setTextColor(100, 116, 139)
            doc.text('[File Belum Ada]', x + photoWidth / 2, rowStartY + photoHeight / 2, { align: 'center' })
          }

          // Label Judul Foto
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(51, 65, 85)
          doc.text(p.title, x + photoWidth / 2, rowStartY + photoHeight + 4, { align: 'center' })

          colIdx++
          if (colIdx >= 4) {
            colIdx = 0
            rowStartY += photoHeight + 10
          }
        }

        currentY = colIdx === 0 ? rowStartY + 6 : rowStartY + photoHeight + 12
      }
    }

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

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
