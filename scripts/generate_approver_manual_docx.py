# scripts/generate_approver_manual_docx.py
# Generator Dokumen Panduan Resmi Khusus Pejabat Penyetuju (Kepala Sekolah & Tim Manajemen)
# Sistem Informasi Peminjaman Kendaraan Operasional (SIPKO) SMKN 1 Subang

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

def create_approver_manual():
    doc = docx.Document()

    # Page Margins (2.5 cm all sides)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Colors
    COLOR_TEAL = RGBColor(13, 148, 136)       # #0D9488 Primary SIPKO
    COLOR_NAVY = RGBColor(30, 41, 59)        # #1E293B Dark Slate Navy
    COLOR_GRAY = RGBColor(100, 116, 139)     # #64748B Muted Gray
    COLOR_DARK = RGBColor(15, 23, 42)        # #0F172A Text Color

    # Base Style
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(11)
    style_normal.font.color.rgb = COLOR_DARK
    style_normal.paragraph_format.line_spacing = 1.15
    style_normal.paragraph_format.space_after = Pt(6)

    # Helper text formatting
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(14)
        run.font.color.rgb = COLOR_NAVY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12)
        run.font.color.rgb = COLOR_TEAL
        return p

    def add_callout(text, title="PETUNJUK KHUSUS"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, "F0FDFA") # Light teal tint
        set_cell_margins(cell, top=140, bottom=140, left=180, right=180)

        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="0D9488"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
        tcPr.append(borders)

        cp = cell.paragraphs[0]
        cp.paragraph_format.space_after = Pt(3)
        rt = cp.add_run(f"📌 {title}: ")
        rt.bold = True
        rt.font.color.rgb = COLOR_TEAL
        rt.font.size = Pt(10)

        rc = cp.add_run(text)
        rc.font.size = Pt(10)
        rc.font.color.rgb = COLOR_DARK

        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Base path for images
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    img_dir = os.path.join(base_dir, "docs", "tutorial_images")

    # =========================================================================
    # 1. COVER / HEADER EKSEKUTIF
    # =========================================================================
    logo_path = os.path.join(img_dir, "logo_smkn1subang.png")
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(12)
        p_logo.paragraph_format.space_after = Pt(10)
        p_logo.add_run().add_picture(logo_path, width=Inches(1.3))

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(2)
    r1 = p_title.add_run("PANDUAN OPERASIONAL PEJABAT PENYETUJU\n")
    r1.bold = True
    r1.font.size = Pt(18)
    r1.font.color.rgb = COLOR_NAVY

    r2 = p_title.add_run("Sistem Informasi Peminjaman Kendaraan Operasional (SIPKO)\n")
    r2.bold = True
    r2.font.size = Pt(14)
    r2.font.color.rgb = COLOR_TEAL

    r3 = p_title.add_run("SMK NEGERI 1 SUBANG — TAHUN AJARAN 2026/2027")
    r3.font.size = Pt(10.5)
    r3.font.color.rgb = COLOR_GRAY

    # Horizontal Rule
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(14)
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_div = p_div.add_run("━" * 55)
    r_div.font.color.rgb = COLOR_TEAL

    # Banner visual cover jika ada
    cover_path = os.path.join(img_dir, "cover_banner.jpg")
    if os.path.exists(cover_path):
        p_cover = doc.add_paragraph()
        p_cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cover.paragraph_format.space_after = Pt(14)
        p_cover.add_run().add_picture(cover_path, width=Inches(6.2))

    # =========================================================================
    # BAB I: PENDAHULUAN & PERAN PEJABAT PENYETUJU
    # =========================================================================
    add_h1("BAB I: PENDAHULUAN & PERAN PEJABAT PENYETUJU")
    
    p = doc.add_paragraph()
    p.add_run(
        "Buku panduan ini disusun khusus bagi "
    )
    r = p.add_run("Kepala Sekolah dan Tim Manajemen (Pejabat Penyetuju / Approver)")
    r.bold = True
    p.add_run(
        " SMKN 1 Subang yang bertugas memberikan persetujuan atau penolakan terhadap permohonan "
        "peminjaman armada kendaraan dinas sekolah (Honda BR-V D 1234 AB dan Minibus Kegiatan D 3456 GH)."
    )

    p2 = doc.add_paragraph(
        "Aplikasi SIPKO dirancang untuk memberikan kemudahan maksimal kepada Pejabat Penyetuju dengan "
        "menghadirkan 2 (dua) opsi kanal persetujuan yang terintegrasi secara langsung:"
    )

    p_kanal1 = doc.add_paragraph(style='List Bullet')
    r_k1 = p_kanal1.add_run("Kanal Utama — Respon Langsung via WhatsApp (Direkomendasikan): ")
    r_k1.bold = True
    p_kanal1.add_run(
        "Pejabat Penyetuju tidak perlu login ke komputer atau membuka halaman web. Notifikasi pengajuan "
        "akan masuk ke WhatsApp pribadi, dan pejabat cukup membalas angka 1 (Setuju) atau 2 (Tolak)."
    )

    p_kanal2 = doc.add_paragraph(style='List Bullet')
    r_k2 = p_kanal2.add_run("Kanal Alternatif — Web Admin Dashboard: ")
    r_k2.bold = True
    p_kanal2.add_run(
        "Melalui peramban web pada alamat https://sipko.smkn1subang.sch.id/admin/pengajuan untuk melihat "
        "dokumen lampiran, rute estimasi di peta, dan riwayat peminjaman pemohon secara detail."
    )

    # =========================================================================
    # BAB II: TATA CARA PERSETUJUAN VIA WHATSAPP (METODE TERCEPAT)
    # =========================================================================
    add_h1("BAB II: TATA CARA PERSETUJUAN CEPAT VIA WHATSAPP")

    doc.add_paragraph(
        "Setiap kali guru atau tenaga kependidikan mengajukan peminjaman kendaraan, Bot WhatsApp SIPKO "
        "akan secara otomatis mengirimkan notifikasi resmi ke nomor WhatsApp Kepala Sekolah seperti format berikut:"
    )

    # Contoh Box WhatsApp Notifikasi Masuk
    table_wa = doc.add_table(rows=1, cols=1)
    table_wa.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_wa = table_wa.cell(0, 0)
    cell_wa.width = Inches(6.5)
    set_cell_background(cell_wa, "0F172A") # Dark Navy Box
    set_cell_margins(cell_wa, top=140, bottom=140, left=180, right=180)

    p_wamsg = cell_wa.paragraphs[0]
    p_wamsg.paragraph_format.line_spacing = 1.15
    p_wamsg.paragraph_format.space_after = Pt(0)
    
    wa_content = (
        "📋 SIPKO — Pengajuan Peminjaman Baru\n\n"
        "Yth. Bapak/Ibu Kepala Sekolah,\n"
        "Terdapat permohonan peminjaman kendaraan baru yang memerlukan persetujuan:\n\n"
        "👤 Pemohon : Budi Santoso, S.Pd\n"
        "🪪 NIP     : 198507122010011005\n"
        "💼 Jabatan : Guru Produktif TKJ\n"
        "🚙 Unit    : Honda BR-V (D 1234 AB)\n"
        "📅 Berangkat: Senin, 02 November 2026 pukul 08.00 WIB\n"
        "📅 Kembali  : Senin, 02 November 2026 pukul 16.00 WIB\n"
        "📍 Tujuan   : Dinas Pendidikan Provinsi Jawa Barat, Bandung\n"
        "🔖 Kode     : SIP-44ZVTGUA\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "⚡ RESPON CEPAT VIA WHATSAPP:\n"
        "👉 Balas 1 untuk SETUJU\n"
        "👉 Balas 2 [Alasan] untuk TOLAK (Contoh: 2 Mobil dinas dipakai dinas luar)\n"
        "━━━━━━━━━━━━━━━━━━━━"
    )
    r_msg = p_wamsg.add_run(wa_content)
    r_msg.font.name = 'Consolas'
    r_msg.font.size = Pt(9.5)
    r_msg.font.color.rgb = RGBColor(226, 232, 240)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    add_h2("1. Menyetujui Pengajuan (Ketik Angka 1)")
    p_acc = doc.add_paragraph()
    p_acc.add_run("Untuk menyetujui peminjaman, Bapak/Ibu cukup mengetik balasan: ")
    r_acc = p_acc.add_run("1")
    r_acc.bold = True
    r_acc.font.color.rgb = COLOR_TEAL
    p_acc.add_run(" atau kata ")
    r_acc2 = p_acc.add_run("SETUJU")
    r_acc2.bold = True
    r_acc2.font.color.rgb = COLOR_TEAL
    p_acc.add_run(". Seketika sistem akan memproses hal berikut:")

    p_acc_bullet1 = doc.add_paragraph(style='List Bullet')
    p_acc_bullet1.add_run("Sistem memverifikasi secara instan bahwa mobil tidak memiliki bentrok jadwal dengan peminjam lain.")
    
    p_acc_bullet2 = doc.add_paragraph(style='List Bullet')
    p_acc_bullet2.add_run("Status pengajuan di database langsung berubah menjadi ")
    p_acc_bullet2.add_run("DISETUJUI").bold = True
    p_acc_bullet2.add_run(".")

    p_acc_bullet3 = doc.add_paragraph(style='List Bullet')
    p_acc_bullet3.add_run("Bot WhatsApp otomatis mengirimkan pesan pemberitahuan kepada Pemohon (Guru/Staf) bahwa permohonannya telah disetujui oleh Kepala Sekolah.")

    p_acc_bullet4 = doc.add_paragraph(style='List Bullet')
    p_acc_bullet4.add_run("Bot membalas pesan WhatsApp Kepala Sekolah yang mengonfirmasi bahwa pengajuan sukses disetujui.")

    add_h2("2. Menolak Pengajuan (Ketik Angka 2 Beserta Alasan)")
    p_rej = doc.add_paragraph()
    p_rej.add_run("Untuk menolak permohonan, ketik angka ")
    r_rej = p_rej.add_run("2")
    r_rej.bold = True
    r_rej.font.color.rgb = RGBColor(225, 29, 72)
    p_rej.add_run(" yang diikuti oleh alasan penolakan pada baris yang sama. Contoh balasan:")

    p_ex1 = doc.add_paragraph(style='List Bullet')
    p_ex1.add_run("2 Mobil dinas dipakai dinas luar Disdik").bold = True

    p_ex2 = doc.add_paragraph(style='List Bullet')
    p_ex2.add_run("2 Jadwal bertabrakan dengan agenda rapat penting sekolah").bold = True

    p_ex3 = doc.add_paragraph(style='List Bullet')
    p_ex3.add_run("2 Kendaraan dijadwalkan masuk bengkel untuk perawatan berkala").bold = True

    add_callout(
        "Jika Bapak/Ibu hanya mengetik angka '2' saja tanpa menyertakan alasan, bot SIPKO akan ramah mengingatkan: "
        "'⚠️ Alasan Penolakan Wajib Diisi. Mohon sertakan alasan penolakan, contoh: 2 Jadwal bentrok'. "
        "Hal ini dirancang agar pemohon mengetahui secara jelas dan transparan alasan permohonan belum dapat dipenuhi.",
        title="PENTING TERKAIT PENOLAKAN"
    )

    add_h2("3. Mencabut / Membatalkan Persetujuan (Ketik BATAL [Alasan])")
    p_batal = doc.add_paragraph()
    p_batal.add_run(
        "Apabila Bapak/Ibu tidak sengaja membalas angka 1 padahal ingin menolak, atau agenda sekolah mendadak berubah "
        "sehingga kendaraan harus dialihkan, Bapak/Ibu dapat mencabut persetujuan seketika cukup dengan membalas pesan WhatsApp:"
    )

    p_ex_batal = doc.add_paragraph(style='List Bullet')
    p_ex_batal.add_run("Format balasan: ").font.color.rgb = COLOR_DARK
    p_ex_batal.add_run("BATAL [Alasan]").bold = True
    p_ex_batal.add_run(" atau ")
    p_ex_batal.add_run("BATAL [KODE_BOOKING] [Alasan]").bold = True

    p_ex_batal2 = doc.add_paragraph(style='List Bullet')
    p_ex_batal2.add_run("Contoh 1: ").font.color.rgb = COLOR_DARK
    p_ex_batal2.add_run("BATAL Tidak sengaja tertekan setuju, mobil harus diservis").bold = True

    p_ex_batal3 = doc.add_paragraph(style='List Bullet')
    p_ex_batal3.add_run("Contoh 2: ").font.color.rgb = COLOR_DARK
    p_ex_batal3.add_run("BATAL SIP-44ZVTGUA Agenda rapat mendadak di sekolah").bold = True

    p_batal_eff = doc.add_paragraph()
    p_batal_eff.add_run("Efek otomatis saat perintah pembatalan dikirim:")
    
    p_batal_b1 = doc.add_paragraph(style='List Bullet')
    p_batal_b1.add_run("Status pengajuan di database langsung diubah menjadi ")
    p_batal_b1.add_run("DIBATALKAN").bold = True
    p_batal_b1.add_run(".")

    p_batal_b2 = doc.add_paragraph(style='List Bullet')
    p_batal_b2.add_run("Jadwal kendaraan dinas tersebut seketika ")
    p_batal_b2.add_run("dibebaskan kembali").bold = True
    p_batal_b2.add_run(" sehingga guru/staf lain dapat mengajukannya.")

    p_batal_b3 = doc.add_paragraph(style='List Bullet')
    p_batal_b3.add_run("Bot WhatsApp otomatis mengirim notifikasi resmi pembatalan beserta alasan ke nomor WhatsApp pemohon.")

    add_h2("4. Tabel Ringkasan Format Balasan WhatsApp")
    
    # Table of Commands
    table_cmd = doc.add_table(rows=6, cols=3)
    table_cmd.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_cmd.autofit = False

    col_widths = [Inches(1.8), Inches(2.2), Inches(2.5)]
    for row in table_cmd.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

    # Header Row
    headers = ["Perintah / Ketikan", "Contoh Balasan", "Efek pada Sistem"]
    for i, title in enumerate(headers):
        cell = table_cmd.cell(0, i)
        set_cell_background(cell, "0D9488")
        set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(title)
        r.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(10)

    rows_data = [
        ("1  atau  SETUJU", "1\natau  SETUJU", "Menyetujui permohonan peminjaman. Notifikasi persetujuan dikirim ke pemohon."),
        ("2 [Alasan]", "2 Mobil dipakai dinas ke Disdik", "Menolak permohonan dan meneruskan alasan resmi ke pemohon via WhatsApp."),
        ("BATAL [Alasan]", "BATAL Salah pencet setuju", "Mencabut/membatalkan persetujuan booking yang sudah disetujui dan membebaskan jadwal armada."),
        ("STATUS", "STATUS", "Bot menampilkan daftar seluruh peminjaman yang sedang menunggu persetujuan."),
        ("BANTUAN", "BANTUAN", "Bot mengirimkan ringkasan petunjuk format balasan persetujuan WhatsApp.")
    ]

    for row_idx, data in enumerate(rows_data, start=1):
        for col_idx, text in enumerate(data):
            cell = table_cmd.cell(row_idx, col_idx)
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            if row_idx % 2 == 1:
                set_cell_background(cell, "F8FAFC")
            else:
                set_cell_background(cell, "FFFFFF")
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.size = Pt(9.5)
            if col_idx == 0:
                r.bold = True
                r.font.color.rgb = COLOR_NAVY
            elif col_idx == 1:
                r.font.name = 'Consolas'
                r.font.color.rgb = COLOR_TEAL

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Gambar ilustrasi approval jika ada
    img_appr = os.path.join(img_dir, "05_panduan_persetujuan_kepsek.png")
    if os.path.exists(img_appr):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        p_img.add_run().add_picture(img_appr, width=Inches(6.0))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(12)
        r_cap = p_cap.add_run("Gambar 1: Alur Respon WhatsApp Pejabat Penyetuju SIPKO")
        r_cap.font.size = Pt(9)
        r_cap.font.color.rgb = COLOR_GRAY
        r_cap.italic = True

    # =========================================================================
    # BAB III: PERSETUJUAN ALTERNATIF MELALUI WEB DASHBOARD
    # =========================================================================
    add_h1("BAB III: PERSETUJUAN VIA WEB DASHBOARD (ALTERNATIF)")

    doc.add_paragraph(
        "Selain menggunakan WhatsApp, Pejabat Penyetuju juga dapat memproses pengajuan melalui antarmuka web, "
        "terutama jika ingin memeriksa dokumen rincian perjalanan, memeriksa kalender pemakaian keseluruhan, atau saat sedang berada di meja kerja kantor:"
    )

    p_web1 = doc.add_paragraph(style='List Bullet')
    p_web1.add_run("Buka alamat: ").font.color.rgb = COLOR_DARK
    p_web1.add_run("https://sipko.smkn1subang.sch.id/login").bold = True
    p_web1.add_run(" pada peramban web (Google Chrome / Safari / Edge).")

    p_web2 = doc.add_paragraph(style='List Bullet')
    p_web2.add_run("Masukkan akun Pejabat Penyetuju yang telah terdaftar di sistem.")

    p_web3 = doc.add_paragraph(style='List Bullet')
    p_web3.add_run("Pilih menu ")
    p_web3.add_run("Pengajuan & Persetujuan").bold = True
    p_web3.add_run(" pada bilah navigasi sebelah kiri.")

    p_web4 = doc.add_paragraph(style='List Bullet')
    p_web4.add_run("Pada baris peminjaman yang berstatus 'Menunggu Persetujuan', klik tombol hijau ")
    p_web4.add_run("[ Setujui ]").bold = True
    p_web4.add_run(" untuk mengizinkan peminjaman, atau tombol merah ")
    p_web4.add_run("[ Tolak ]").bold = True
    p_web4.add_run(" untuk menolak (masukkan alasan pada jendela konfirmasi yang muncul).")

    p_web5 = doc.add_paragraph(style='List Bullet')
    p_web5.add_run("Untuk membatalkan persetujuan yang sudah terlanjur diberikan, klik tombol merah ")
    p_web5.add_run("[ ⚠️ Batalkan ]").bold = True
    p_web5.add_run(" pada tabel daftar atau buka halaman Detail booking dan gunakan form ")
    p_web5.add_run("Batalkan Persetujuan / Cabut Booking").bold = True
    p_web5.add_run(" dengan menyertakan alasan pembatalan.")

    # =========================================================================
    # BAB IV: KEAMANAN & PRIVASI NOMOR PEJABAT
    # =========================================================================
    add_h1("BAB IV: KEAMANAN & PRIVASI NOMOR WHATSAPP PEJABAT")

    doc.add_paragraph(
        "Sistem SIPKO mengimplementasikan standar keamanan ketat untuk melindungi kenyamanan dan privasi Pejabat Penyetuju:"
    )

    p_sec1 = doc.add_paragraph(style='List Bullet')
    r_s1 = p_sec1.add_run("Mode Senyap Total (Silent Mode) untuk Nomor Lain: ")
    r_s1.bold = True
    p_sec1.add_run(
        "Nomor WhatsApp yang digunakan oleh bot SIPKO tidak akan membalas pesan dari nomor umum/anonim. "
        "Hal ini menjamin bahwa jika nomor WhatsApp tersebut digunakan untuk keperluan pribadi sekolah atau "
        "menerima chat dari orang tua/rekan kerja, bot tidak akan mengganggu percakapan umum tersebut."
    )

    p_sec2 = doc.add_paragraph(style='List Bullet')
    r_s2 = p_sec2.add_run("Otentikasi Basis Data Pejabat: ")
    r_s2.bold = True
    p_sec2.add_run(
        "Perintah balasan angka '1' atau '2' hanya akan diterima jika dikirimkan oleh nomor telepon yang telah resmi "
        "terdaftar dengan hak akses Pejabat Penyetuju (Role: APPROVER). Nomor orang lain yang mencoba mengetik balasan "
        "tersebut tidak akan direspon dan tidak memiliki izin mengubah status peminjaman."
    )

    p_sec3 = doc.add_paragraph(style='List Bullet')
    r_s3 = p_sec3.add_run("Pencegahan Bentrok Otomatis (Race Condition Protection): ")
    r_s3.bold = True
    p_sec3.add_run(
        "Apabila ada dua pemohon yang meminta unit mobil yang sama pada jadwal waktu yang bersamaan, "
        "sistem secara otomatis hanya mengizinkan persetujuan pertama dan memberikan peringatan bentrok jadwal "
        "untuk pengajuan berikutnya demi mencegah pemesanan ganda (double-booking)."
    )

    # =========================================================================
    # BAB V: TANYA JAWAB (FAQ) & KONTAK BANTUAN
    # =========================================================================
    add_h1("BAB V: PERTANYAAN UMUM (FAQ) & BANTUAN TEKNIS")

    faqs = [
        ("Bagaimana jika saya tidak sengaja membalas '1' padahal ingin menolak?",
         "Bapak/Ibu memiliki 2 cara mudah yang sudah langsung aktif: (1) Cukup balas chat bot WhatsApp dengan mengetik: BATAL [Alasan] (contoh: BATAL Salah setujui, mobil dipakai dinas lain). Sistem seketika membatalkan peminjaman, membebaskan jadwal armada, dan mengirim notifikasi pembatalan ke WhatsApp pemohon. (2) Atau buka Web Dashboard pada menu 'Pengajuan & Persetujuan' lalu klik tombol [ Batalkan ] untuk mencabut persetujuan."),
        ("Apakah saya harus selalu membuka website untuk mengecek permohonan baru?",
         "Tidak perlu sama sekali. Sistem SIPKO dirancang agar Bapak/Ibu Kepala Sekolah cukup memantau dan membalas melalui aplikasi WhatsApp yang sudah biasa digunakan sehari-hari."),
        ("Berapa lama batas waktu bagi Pejabat Penyetuju untuk memberikan keputusan?",
         "Disarankan untuk memberikan respon sebelum waktu jadwal keberangkatan pemohon tiba, agar guru/staf memiliki kepastian dinas dan persiapan fisik armada dapat disiapkan oleh petugas Sarpras.")
    ]

    for q, a in faqs:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(6)
        p_q.paragraph_format.space_after = Pt(2)
        r_q = p_q.add_run(f"Q: {q}")
        r_q.bold = True
        r_q.font.color.rgb = COLOR_NAVY

        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_after = Pt(6)
        r_a = p_a.add_run(f"A: {a}")
        r_a.font.color.rgb = COLOR_DARK

    add_callout(
        "Bila terdapat kendala operasional, pembaruan nomor WhatsApp pejabat, atau pertanyaan teknis seputar aplikasi, "
        "silakan menghubungi Unit Sarana dan Prasarana / Administrator IT SIPKO SMKN 1 Subang.",
        title="KONTAK DUKUNGAN TEKNIS"
    )

    # Output filename
    output_filename = "PANDUAN_OPERASIONAL_KEPALA_SEKOLAH_SIPKO_SMKN1_SUBANG.docx"
    output_path = os.path.join(base_dir, output_filename)
    try:
        doc.save(output_path)
        print(f"[OK] Dokumen berhasil dibuat: {output_path}")
    except PermissionError:
        alt_filename = "PANDUAN_OPERASIONAL_KEPALA_SEKOLAH_SIPKO_SMKN1_SUBANG_TERBARU.docx"
        alt_path = os.path.join(base_dir, alt_filename)
        doc.save(alt_path)
        print(f"[OK] File sedang dibuka di Word. Dokumen terbaru disimpan di: {alt_path}")

if __name__ == "__main__":
    create_approver_manual()
