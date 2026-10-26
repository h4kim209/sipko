# scripts/generate_manual_docx.py
# Generator Dokumen Panduan Pengguna SIPKO (Format .docx Lengkap dengan Ilustrasi Tutorial)

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    """Set background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    """Set padding/margins for a table cell in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_manual_document():
    doc = docx.Document()

    # Page Margins (2.5 cm all sides)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Colors
    COLOR_TEAL = RGBColor(13, 148, 136)       # #0D9488 Primary SIPKO
    COLOR_NAVY = RGBColor(30, 41, 59)        # #1E293B
    COLOR_GRAY = RGBColor(100, 116, 139)     # #64748B
    COLOR_DARK = RGBColor(15, 23, 42)        # #0F172A

    # Normal Style
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(11)
    style_normal.font.color.rgb = COLOR_DARK
    style_normal.paragraph_format.line_spacing = 1.15
    style_normal.paragraph_format.space_after = Pt(6)

    # Helper functions
    def add_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(22)
        run.font.color.rgb = COLOR_NAVY
        return p

    def add_subtitle(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(14)
        run = p.add_run(text)
        run.font.size = Pt(13)
        run.font.color.rgb = COLOR_TEAL
        run.bold = True
        return p

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(15)
        run.font.color.rgb = COLOR_NAVY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12.5)
        run.font.color.rgb = COLOR_TEAL
        return p

    def add_callout(text, title="TIPS PENTING"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, "F0FDFA") # Light teal tint
        set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="single" w:sz="36" w:space="0" w:color="0D9488"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
        tcPr.append(borders)

        cp = cell.paragraphs[0]
        cp.paragraph_format.space_after = Pt(2)
        r_title = cp.add_run(f"📌 {title}: ")
        r_title.bold = True
        r_title.font.color.rgb = COLOR_TEAL
        r_title.font.size = Pt(10.5)

        r_text = cp.add_run(text)
        r_text.font.size = Pt(10.5)
        r_text.font.color.rgb = COLOR_NAVY

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_after = Pt(4)

    def add_image(img_rel_path, caption="", width_inch=6.3):
        full_path = os.path.abspath(img_rel_path)
        if os.path.exists(full_path):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            run = p.add_run()
            run.add_picture(full_path, width=Inches(width_inch))
            if caption:
                p_cap = doc.add_paragraph()
                p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_cap.paragraph_format.space_before = Pt(2)
                p_cap.paragraph_format.space_after = Pt(12)
                r_cap = p_cap.add_run(f"Ilustrasi: {caption}")
                r_cap.font.size = Pt(9.5)
                r_cap.font.italic = True
                r_cap.font.color.rgb = COLOR_GRAY

    def add_table_data(headers, rows, col_widths=None):
        table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Header Row
        hdr_cells = table.rows[0].cells
        for i, header_text in enumerate(headers):
            hdr_cells[i].text = header_text
            set_cell_background(hdr_cells[i], "0D9488")
            set_cell_margins(hdr_cells[i], top=100, bottom=100, left=140, right=140)
            for p in hdr_cells[i].paragraphs:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    r.bold = True
                    r.font.size = Pt(10)
                    r.font.color.rgb = RGBColor(255, 255, 255)

        # Body Rows
        for r_idx, row_data in enumerate(rows):
            row_cells = table.rows[r_idx + 1].cells
            bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, cell_value in enumerate(row_data):
                row_cells[c_idx].text = str(cell_value)
                set_cell_background(row_cells[c_idx], bg_color)
                set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=140, right=140)
                for p in row_cells[c_idx].paragraphs:
                    p.paragraph_format.space_after = Pt(0)
                    for r in p.runs:
                        r.font.size = Pt(9.5)
                        r.font.color.rgb = COLOR_NAVY

        # Apply borders
        tblPr = table._tbl.tblPr
        tblBorders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="none"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders>')
        tblPr.append(tblBorders)

        if col_widths:
            for row in table.rows:
                for idx, width in enumerate(col_widths):
                    row.cells[idx].width = Inches(width)

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_after = Pt(4)

    # ==========================================
    # HALAMAN JUDUL / COVER
    # ==========================================
    # Logo Resmi Sekolah di Halaman Sampul
    logo_path = os.path.abspath("docs/tutorial_images/logo_smkn1subang.png")
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(0)
        p_logo.paragraph_format.space_after = Pt(4)
        run_logo = p_logo.add_run()
        run_logo.add_picture(logo_path, width=Inches(1.2))

    add_title("PANDUAN PENGGUNAAN SISTEM (USER MANUAL)")
    add_subtitle("SIPKO — SISTEM PEMINJAMAN KENDARAAN OPERASIONAL\nSMK NEGERI 1 SUBANG")

    # Cover Image Banner (Honda BR-V & Logo Resmi SMKN 1 Subang)
    add_image("docs/tutorial_images/cover_banner.jpg", "Aplikasi SIPKO — SMKN 1 Subang (Armada Honda BR-V)", width_inch=6.2)

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_before = Pt(8)
    p_meta.paragraph_format.space_after = Pt(14)
    r = p_meta.add_run("Dokumen Resmi untuk Pemohon & Pejabat Penyetuju (Kepala Sekolah)\nVersi 1.0 — Tahun 2026\nPortal Web: https://sipko.smkn1subang.sch.id")
    r.font.size = Pt(10.5)
    r.font.color.rgb = COLOR_GRAY

    doc.add_page_break()

    # ==========================================
    # BAB 1: PENGENALAN SISTEM
    # ==========================================
    add_h1("BAB 1: MENGENAL APLIKASI SIPKO")
    
    doc.add_paragraph(
        "SIPKO (Sistem Peminjaman Kendaraan Operasional) adalah aplikasi web resmi SMKN 1 Subang "
        "yang dirancang untuk mendigitalisasi seluruh alur peminjaman armada mobil dinas sekolah. "
        "Dengan sistem ini, seluruh proses pengajuan izin, persetujuan Kepala Sekolah, pemeriksaan fisik armada, "
        "hingga notifikasi WhatsApp dilakukan secara cepat, transparan, dan tanpa berkas kertas (paperless)."
    )

    add_h2("1.1 Keunggulan Utama SIPKO")
    bullet_points = [
        ("Mudah & Praktis: ", "Pemohon dapat mengajukan permohonan pinjam mobil langsung dari HP/Laptop tanpa login akun khusus."),
        ("Notifikasi WhatsApp Otomatis: ", "Status persetujuan, kode booking, dan bukti pengembalian langsung dikirim ke WhatsApp pemohon dan Kepala Sekolah secara real-time."),
        ("Pemeriksaan Kendaraan Digital: ", "Foto kondisi fisik mobil dan angka speedometer (odometer) wajib diunggah di awal dan akhir perjalanan untuk menjaga keamanan dan akuntabilitas aset sekolah."),
        ("Transparan & Terdokumentasi: ", "Jadwal pemakaian kendaraan dapat dipantau bersama di kalender sistem sehingga tidak terjadi jadwal bentrok antar-kegiatan dinas.")
    ]
    for b_title, b_desc in bullet_points:
        p = doc.add_paragraph(style='List Bullet')
        r1 = p.add_run(b_title)
        r1.bold = True
        r1.font.color.rgb = COLOR_NAVY
        r2 = p.add_run(b_desc)

    add_h2("1.2 Alur Singkat Peminjaman Kendaraan")
    headers_alur = ["Tahap", "Aktor", "Aksi yang Dilakukan", "Status di Sistem"]
    rows_alur = [
        ["1", "Pemohon (Guru/Staf)", "Isi form peminjaman via website", "MENUNGGU_PERSETUJUAN"],
        ["2", "Kepala Sekolah", "Terima WA -> Tinjau & Klik Setuju", "DISETUJUI"],
        ["3", "Pemohon", "Upload foto mobil & KM awal saat ambil kunci", "SIAP_BERANGKAT"],
        ["4", "Pemohon", "Klik tombol 'Mulai Perjalanan' saat berangkat", "SEDANG_DIGUNAKAN"],
        ["5", "Pemohon", "Upload foto mobil & KM akhir saat mengembalikan", "MENUNGGU_PEMERIKSAAN_PENGEMBALIAN"],
        ["6", "Admin Sarpras", "Periksa fisik/odometer -> Selesai", "SELESAI"]
    ]
    add_table_data(headers_alur, rows_alur, [0.6, 1.4, 2.7, 1.8])

    # Diagram Infografis Alur 6 Tahap
    add_image("docs/tutorial_images/01_alur_lengkap_sipko.png", "Diagram Infografis 6 Tahap Peminjaman Kendaraan di SIPKO")

    doc.add_page_break()

    # ==========================================
    # BAB 2: PANDUAN UNTUK PEMOHON
    # ==========================================
    add_h1("BAB 2: PANDUAN UNTUK PEMOHON (GURU & STAF)")
    doc.add_paragraph(
        "Bab ini ditujukan bagi guru, wali kelas, ketua program keahlian, atau tenaga kependidikan yang ingin "
        "mengajukan permohonan peminjaman mobil dinas SMKN 1 Subang untuk tugas luar, dinas, lomba, atau kegiatan sekolah lainnya."
    )

    add_h2("2.1 Langkah 1: Mengisi Formulir Pengajuan")
    doc.add_paragraph("1. Buka browser (Chrome / Edge / Safari) di HP atau Laptop Anda, lalu kunjungi:")
    p_url = doc.add_paragraph()
    r_url = p_url.add_run("   👉 https://sipko.smkn1subang.sch.id")
    r_url.bold = True
    r_url.font.color.rgb = COLOR_TEAL

    doc.add_paragraph("2. Pada halaman utama, klik tombol hijau bertuliskan '📝 Buat Pengajuan'.")
    doc.add_paragraph("3. Lengkapi formulir pengajuan dengan data yang sebenarnya:")

    headers_form = ["Kolom Isian", "Keterangan & Petunjuk Pengisian"]
    rows_form = [
        ["Nama Lengkap *", "Isi dengan nama lengkap pemohon beserta gelar (contoh: Drs. Ahmad Hidayat, M.Pd)."],
        ["NIP / NUPTK", "Nomor Identitas Pegawai (opsional jika honorer/staf khusus)."],
        ["Jabatan & Unit Kerja *", "Pilih jabatan (Guru / Pembina OSIS / Wakasek) dan Jurusan / Unit kerja Anda."],
        ["Nomor WhatsApp Aktif *", "Wajib nomor WA aktif (contoh: 081234567890). Sistem akan mengirimkan notifikasi ke nomor ini."],
        ["Pilih Kendaraan *", "Pilih mobil yang berstatus 'Tersedia' (Honda BR-V, Mobil Dinas 2, Minibus, atau Pickup)."],
        ["Tujuan Perjalanan *", "Nama instansi/lokasi tujuan (contoh: Dinas Pendidikan Jabar / Gedung Sate)."],
        ["Kategori Keperluan *", "Pilih kategori yang sesuai (Dinas Luar, Lomba Siswa, Kunjungan Industri, Operasional Sekolah)."],
        ["Waktu Berangkat & Kembali *", "Pilih tanggal dan jam keberangkatan serta estimasi jam kembali ke sekolah."],
        ["Jumlah Penumpang", "Estimasi jumlah rombongan yang ikut serta."]
    ]
    add_table_data(headers_form, rows_form, [2.0, 4.5])

    doc.add_paragraph("4. Periksa kembali seluruh data, lalu klik tombol 'Kirim Permohonan'.")

    # Gambar Formulir Pengajuan
    add_image("docs/tutorial_images/02_panduan_pemohon_formulir.png", "Panduan Pengisian Formulir Pengajuan Mobil Dinas")

    add_callout(
        "Catat atau screenshot Kode Booking unik Anda (contoh: SIP-2Z6C9YRZ). "
        "Kode ini juga akan otomatis dikirimkan oleh sistem ke nomor WhatsApp Anda.",
        "PENTING DIINGAT"
    )

    add_h2("2.2 Langkah 2: Notifikasi WhatsApp Real-Time")
    doc.add_paragraph(
        "Setelah Anda mengirim pengajuan, sistem SIPKO otomatis mengirimkan notifikasi ke WhatsApp Kepala Sekolah dan pemohon. "
        "Anda tidak perlu mencetak surat pengantar fisik ke meja Kepala Sekolah."
    )
    doc.add_paragraph(
        "Ketika Kepala Sekolah menyetujui, Anda akan langsung menerima pesan WhatsApp resmi dari SIPKO yang memberitahukan "
        "bahwa peminjaman mobil Anda telah DISETUJUI, lengkap dengan rincian mobil dan jadwal."
    )

    # Gambar Notifikasi WhatsApp
    add_image("docs/tutorial_images/03_panduan_whatsapp_notifikasi.png", "Tampilan Chat WhatsApp Notifikasi Kode Booking & Persetujuan")

    add_h2("2.3 Langkah 3: Pemeriksaan Awal Sebelum Berangkat (Ambil Kunci)")
    doc.add_paragraph(
        "Sebelum mobil dijalankan dan kunci diserahkan oleh petugas Sarpras, pemohon diwajibkan mendokumentasikan kondisi awal mobil:"
    )
    doc.add_paragraph("1. Masuk ke menu '🔍 Cek Kode Booking' (https://sipko.smkn1subang.sch.id/cek-booking).")
    doc.add_paragraph("2. Masukkan Kode Booking Anda dan Nomor WhatsApp yang didaftarkan.")
    doc.add_paragraph("3. Klik tombol '📸 Upload Bukti Pemeriksaan Awal'. Lengkapi input:")
    
    p_step1 = doc.add_paragraph(style='List Bullet')
    p_step1.add_run("Kilometer Awal (Odometer): ").bold = True
    p_step1.add_run("Ketikkan angka KM yang tertera di speedometer mobil saat itu (contoh: 93001).")

    p_step2 = doc.add_paragraph(style='List Bullet')
    p_step2.add_run("Foto Speedometer Awal: ").bold = True
    p_step2.add_run("Ambil foto jelas pada speedometer yang memperlihatkan angka kilometer awal.")

    p_step3 = doc.add_paragraph(style='List Bullet')
    p_step3.add_run("Foto Kondisi Kendaraan (Minimal 3 Foto): ").bold = True
    p_step3.add_run("Ambil foto interior depan, jok penumpang, dan bodi luar mobil untuk memastikan kebersihan mobil.")

    doc.add_paragraph("4. Klik tombol 'Kirim Bukti Awal'.")
    doc.add_paragraph("5. Saat rombongan hendak meluncur berangkat keluar gerbang, klik tombol '🚗 Mulai Perjalanan'. Status mobil akan berubah menjadi SEDANG DIGUNAKAN.")

    # Gambar Pemeriksaan Awal
    add_image("docs/tutorial_images/04_panduan_pemeriksaan_awal.png", "Langkah Upload Foto Odometer & Kondisi Fisik Mobil Awal")

    doc.add_page_break()

    # ==========================================
    # BAB 3: PANDUAN UNTUK PEJABAT PENYETUJU
    # ==========================================
    add_h1("BAB 3: PANDUAN PEJABAT PENYETUJU (KEPALA SEKOLAH)")
    doc.add_paragraph(
        "Bab ini adalah panduan ringkas bagi Kepala Sekolah atau Pejabat Berwenang yang bertindak sebagai "
        "approver untuk menyetujui atau menolak izin penggunaan mobil dinas sekolah."
    )

    add_h2("3.1 Notifikasi WhatsApp Pengajuan Masuk")
    doc.add_paragraph(
        "Setiap kali ada guru/staf yang mengajukan permohonan pinjam mobil, Kepala Sekolah akan langsung menerima "
        "pesan WhatsApp otomatis dari SIPKO dengan format ringkas yang berisi nama pemohon, mobil, tujuan, dan jam berangkat."
    )

    add_h2("3.2 Langkah Login & Meninjau Permohonan")
    doc.add_paragraph("1. Kunjungi halaman login resmi: https://sipko.smkn1subang.sch.id/login")
    doc.add_paragraph("2. Masukkan akun Penyetuju:")
    doc.add_paragraph("   • Email: kepsek@smkn1subang.sch.id")
    doc.add_paragraph("   • Password: (password akun Anda)")
    doc.add_paragraph("3. Masuk ke menu '📝 Pengajuan & Persetujuan' di sidebar.")
    doc.add_paragraph("4. Klik pengajuan pemohon untuk melihat detail lengkap (pemohon, mobil, estimasi jarak KM, dan keperluan dinas).")
    doc.add_paragraph("5. Di bagian bawah formulir, tentukan keputusan:")
    
    p_act1 = doc.add_paragraph(style='List Bullet')
    p_act1.add_run("Tombol Hijau [✓ Setujui Pengajuan]: ").bold = True
    p_act1.add_run("Permohonan diizinkan. Pemohon langsung menerima konfirmasi WhatsApp.")

    p_act2 = doc.add_paragraph(style='List Bullet')
    p_act2.add_run("Tombol Merah [✕ Tolak Pengajuan]: ").bold = True
    p_act2.add_run("Permohonan ditolak (sertakan alasan penolakan pada kolom catatan).")

    # Gambar Halaman Persetujuan Kepsek
    add_image("docs/tutorial_images/05_panduan_persetujuan_kepsek.png", "Halaman Tinjauan & Tombol Persetujuan Kepala Sekolah")

    doc.add_page_break()

    # ==========================================
    # BAB 4: PANDUAN PENGELOLA SARPRAS & ADMIN
    # ==========================================
    add_h1("BAB 4: PENGEMBALIAN & GRAFIK KM OTOMATIS")
    doc.add_paragraph(
        "Setelah perjalanan dinas selesai, pemohon mengembalikan mobil dan mengunggah bukti pengembalian. "
        "Sistem secara otomatis menghitung jarak tempuh dan memperbarui grafik kilometer mobil."
    )

    add_h2("4.1 Langkah Pengembalian oleh Pemohon")
    doc.add_paragraph("1. Buka kembali halaman Cek Booking Anda di web SIPKO.")
    doc.add_paragraph("2. Klik tombol '📋 Upload Bukti Pengembalian'.")
    doc.add_paragraph("3. Masukkan angka Kilometer Akhir (Odometer) terbaru.")
    doc.add_paragraph("4. Unggah foto speedometer akhir dan foto kebersihan fisik mobil.")
    doc.add_paragraph("5. Jika selama perjalanan dinas dilakukan pengisian BBM, unggah foto struk pembelian BBM SPBU.")
    doc.add_paragraph("6. Klik 'Kirim Bukti Pengembalian' dan serahkan kunci mobil ke staf Sarpras.")

    add_h2("4.2 Pembaruan Otomatis Odometer & Grafik KM")
    doc.add_paragraph(
        "Begitu admin Sarpras memverifikasi pengembalian, status booking menjadi SELESAI. "
        "Odometer kendaraan langsung terupdate secara real-time dan kurva grafik pemakaian di menu "
        "'📈 Grafik KM Kendaraan' serta Dashboard Admin otomatis bertambah sesuai jarak tempuh perjalanan."
    )

    # Gambar Pengembalian & Grafik KM
    add_image("docs/tutorial_images/06_panduan_pengembalian_dan_grafik.png", "Tahap Pengembalian, Upload Struk BBM, dan Update Grafik KM Otomatis")

    # ==========================================
    # BAB 5: TANYA JAWAB UMUM (FAQ)
    # ==========================================
    add_h1("BAB 5: TANYA JAWAB UMUM (FAQ)")
    
    faqs = [
        ("Bagaimana jika saya lupa atau kehilangan Kode Booking?",
         "Cukup buka menu Cek Booking lalu masukkan nomor WhatsApp yang Anda gunakan saat mendaftar. Sistem juga menyimpan riwayat kode booking di chat WhatsApp Anda."),
        ("Apakah pemohon harus membuat akun / password untuk meminjam mobil?",
         "Tidak perlu. Pemohon cukup mengisi formulir di halaman utama. Akun dan password hanya diperuntukkan bagi Kepala Sekolah (Approver) dan Petugas Sarpras (Admin)."),
        ("Bagaimana jika saat perjalanan ada bensin habis atau ban bocor?",
         "Catat kejadian pada kolom 'Catatan Insiden / Kendala' saat mengunggah bukti pengembalian dan simpan struk pengeluaran/bon bengkel untuk difoto pada form pengembalian."),
        ("Berapa lama notifikasi WhatsApp terkirim setelah pengajuan?",
         "Notifikasi WhatsApp dikirim secara instan (real-time dalam hitungan detik) ke nomor pemohon dan Kepala Sekolah setelah formulir dikirim."),
        ("Ke mana saya harus menghubungi jika membutuhkan bantuan teknis?",
         "Hubungi Tim IT / Helpdesk Sarpras SMKN 1 Subang melalui ruang Lab Komputer atau kontak WA Admin Sarpras.")
    ]

    for q, a in faqs:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(8)
        p_q.paragraph_format.space_after = Pt(2)
        p_q.paragraph_format.keep_with_next = True
        r_q = p_q.add_run(f"Q: {q}")
        r_q.bold = True
        r_q.font.color.rgb = COLOR_NAVY

        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_after = Pt(6)
        r_a = p_a.add_run(f"A: {a}")
        r_a.font.color.rgb = COLOR_DARK

    # Simpan dokumen
    output_filename = "PANDUAN_PENGGUNAAN_SIPKO_SMKN1_SUBANG_LENGKAP_BERGAMBAR.docx"
    output_path = os.path.abspath(output_filename)
    doc.save(output_path)
    print(f"Dokumen berhasil dibuat dengan gambar: {output_path}")

    # Coba simpan juga ke nama asli jika Word sedang tidak mengunci
    try:
        alt_path = os.path.abspath("PANDUAN_PENGGUNAAN_SIPKO_SMKN1_SUBANG.docx")
        doc.save(alt_path)
        print(f"Dokumen asli juga berhasil diperbarui: {alt_path}")
    except Exception as e:
        print(f"Catatan: File asli sedang dibuka di aplikasi lain, versi bergambar tersimpan di: {output_path}")

if __name__ == "__main__":
    create_manual_document()
