# scripts/generate_tutorial_images.py
# Membuat gambar diagram dan tutorial visual untuk Buku Panduan SIPKO

import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.abspath("docs/tutorial_images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Color Palette
TEAL = (13, 148, 136)         # #0D9488 Primary
TEAL_LIGHT = (240, 253, 250)   # #F0FDFA
NAVY = (30, 41, 59)           # #1E293B
NAVY_LIGHT = (248, 250, 252)  # #F8FAFC
GRAY = (100, 116, 139)        # #64748B
GRAY_LIGHT = (241, 245, 249)  # #F1F5F9
BORDER = (226, 232, 240)      # #E2E8F0
WHITE = (255, 255, 255)
GREEN = (16, 185, 129)        # #10B981
GREEN_LIGHT = (236, 253, 245)
RED = (239, 68, 68)           # #EF4444
RED_LIGHT = (254, 242, 242)
AMBER = (245, 158, 11)        # #F59E0B
AMBER_LIGHT = (254, 243, 199)
DARK = (15, 23, 42)

def get_font(size, bold=False):
    font_name = "segoeuib.ttf" if bold else "segoeui.ttf"
    try:
        return ImageFont.truetype(font_name, size)
    except:
        try:
            return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)
        except:
            return ImageFont.load_default()

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def draw_header(draw, title, subtitle, width, img=None):
    # Top banner
    draw.rectangle([0, 0, width, 95], fill=NAVY)
    draw.rectangle([0, 91, width, 95], fill=TEAL)
    
    font_title = get_font(24, bold=True)
    font_sub = get_font(13, bold=False)
    
    text_x = 40
    logo_path = os.path.join(OUTPUT_DIR, "logo_smkn1subang.png")
    if img and os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path).convert("RGBA")
            logo = logo.resize((68, 68), Image.Resampling.LANCZOS)
            img.paste(logo, (35, 14), logo)
            text_x = 120
        except Exception:
            pass
    
    draw.text((text_x, 20), title, fill=WHITE, font=font_title)
    draw.text((text_x, 56), subtitle, fill=(153, 246, 228), font=font_sub)

def create_img_01_alur_lengkap():
    """Diagram Alur 6 Tahap Peminjaman Kendaraan"""
    width, height = 1200, 780
    img = Image.new("RGB", (width, height), NAVY_LIGHT)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "ALUR PROSES PEMINJAMAN KENDARAAN (SIPKO)", "SMK NEGERI 1 SUBANG — SISTEM DIGITAL PAPERLESS", width, img=img)

    steps = [
        ("1. Buat Pengajuan", "Pemohon mengisi form online di web tanpa perlu login.", "Pemohon", TEAL, "https://sipko..."),
        ("2. Persetujuan Kepsek", "Kepsek menerima notif WA, meninjau & klik Setujui.", "Kepala Sekolah", GREEN, "WA & Portal Admin"),
        ("3. Pemeriksaan Awal", "Upload foto speedometer & fisik mobil sebelum berangkat.", "Pemohon & Sarpras", AMBER, "Menu Cek Booking"),
        ("4. Mulai Perjalanan", "Klik 'Mulai Perjalanan', status mobil jadi IN USE.", "Pemohon", NAVY, "Perjalanan Dinas"),
        ("5. Upload Pengembalian", "Upload foto speedometer akhir, fisik mobil & struk BBM.", "Pemohon", (217, 119, 6), "Menu Cek Booking"),
        ("6. Verifikasi & Selesai", "Sarpras cek bukti, status SELESAI, KM terupdate otomatis.", "Admin Sarpras", (16, 185, 129), "Dashboard Sarpras"),
    ]

    # Draw 2 rows of 3 cards
    card_w, card_h = 345, 270
    positions = [
        (40, 130), (425, 130), (810, 130),
        (40, 440), (425, 440), (810, 440),
    ]

    font_card_title = get_font(18, bold=True)
    font_actor = get_font(12, bold=True)
    font_desc = get_font(14)
    font_badge = get_font(12, bold=True)
    font_arrow = get_font(22, bold=True)

    for i, (pos, (title, desc, actor, color, loc)) in enumerate(zip(positions, steps)):
        x, y = pos
        # Card background
        draw_rounded_rect(draw, [x, y, x + card_w, y + card_h], radius=14, fill=WHITE, outline=BORDER, width=2)
        # Top color accent
        draw_rounded_rect(draw, [x, y, x + card_w, y + 12], radius=14, fill=color)
        draw.rectangle([x, y + 6, x + card_w, y + 12], fill=color)

        # Step Number Badge
        draw_rounded_rect(draw, [x + 20, y + 26, x + 60, y + 66], radius=8, fill=color)
        draw.text((x + 32, y + 32), str(i + 1), fill=WHITE, font=get_font(20, bold=True))

        # Actor badge
        draw_rounded_rect(draw, [x + 72, y + 32, x + 230, y + 60], radius=6, fill=GRAY_LIGHT)
        draw.text((x + 82, y + 38), f"Aktor: {actor}", fill=NAVY, font=font_actor)

        # Title
        draw.text((x + 20, y + 84), title, fill=DARK, font=font_card_title)

        # Description (split words)
        words = desc.split(" ")
        line1, line2 = "", ""
        for w in words:
            if len(line1) + len(w) < 32:
                line1 += w + " "
            else:
                line2 += w + " "
        draw.text((x + 20, y + 124), line1.strip(), fill=GRAY, font=font_desc)
        draw.text((x + 20, y + 150), line2.strip(), fill=GRAY, font=font_desc)

        # Footer Pill
        draw_rounded_rect(draw, [x + 20, y + 200, x + card_w - 20, y + 238], radius=8, fill=NAVY_LIGHT, outline=BORDER)
        draw.text((x + 32, y + 210), f"Akses: {loc}", fill=TEAL, font=font_badge)

    # Save
    out_path = os.path.join(OUTPUT_DIR, "01_alur_lengkap_sipko.png")
    img.save(out_path)
    return out_path

def create_img_02_formulir_pemohon():
    """Panduan Langkah 1: Pengisian Formulir Pemohon"""
    width, height = 1200, 780
    img = Image.new("RGB", (width, height), NAVY_LIGHT)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "PANDUAN PEMOHON: MENGISI FORMULIR PENGAJUAN", "LANGKAH 1: AKSES WEBSITE & ISI DATA PEMINJAMAN", width, img=img)

    # Left Column: Form Mockup (Width 640)
    fx, fy = 40, 120
    fw, fh = 680, 620
    draw_rounded_rect(draw, [fx, fy, fx + fw, fy + fh], radius=14, fill=WHITE, outline=BORDER, width=2)
    # Form Header
    draw_rounded_rect(draw, [fx, fy, fx + fw, fy + 55], radius=14, fill=TEAL_LIGHT)
    draw.rectangle([fx, fy + 40, fx + fw, fy + 55], fill=TEAL_LIGHT)
    draw.text((fx + 24, fy + 16), "Formulir Peminjaman Kendaraan Dinas", fill=TEAL, font=get_font(18, bold=True))

    form_fields = [
        ("Nama Lengkap *", "Drs. Ahmad Hidayat, M.Pd"),
        ("NIP / NUPTK", "19780512 200501 1 004"),
        ("Jabatan & Unit *", "Guru Pembina OSIS — Rekayasa Perangkat Lunak"),
        ("Nomor WhatsApp Aktif *", "081234567890 (Menerima Notifikasi Kode Booking)"),
        ("Pilih Kendaraan *", "Mobil Dinas 1 — Honda BR-V (D 1234 AB) [Tersedia]"),
        ("Tujuan Perjalanan *", "Dinas Pendidikan Provinsi Jawa Barat, Bandung"),
        ("Waktu Berangkat & Kembali *", "21 Okt 2026, 08:00 WIB s/d 21 Okt 2026, 16:00 WIB"),
    ]

    f_y = fy + 75
    for label, val in form_fields:
        draw.text((fx + 24, f_y), label, fill=NAVY, font=get_font(13, bold=True))
        draw_rounded_rect(draw, [fx + 24, f_y + 22, fx + fw - 24, f_y + 56], radius=6, fill=NAVY_LIGHT, outline=BORDER)
        draw.text((fx + 36, f_y + 30), val, fill=DARK, font=get_font(13))
        f_y += 66

    # Button
    draw_rounded_rect(draw, [fx + 24, f_y + 10, fx + fw - 24, f_y + 56], radius=8, fill=TEAL)
    draw.text((fx + fw//2 - 90, f_y + 22), "KIRIM PERMOHONAN", fill=WHITE, font=get_font(15, bold=True))

    # Right Column: Petunjuk Penting (Width 420)
    rx, ry = 750, 120
    rw, rh = 410, 620
    draw_rounded_rect(draw, [rx, ry, rx + rw, ry + rh], radius=14, fill=WHITE, outline=BORDER, width=2)
    draw_rounded_rect(draw, [rx, ry, rx + rw, ry + 55], radius=14, fill=NAVY)
    draw.rectangle([rx, ry + 40, rx + rw, ry + 55], fill=NAVY)
    draw.text((rx + 24, ry + 16), "PETUNJUK PENGISIAN", fill=WHITE, font=get_font(18, bold=True))

    notes = [
        ("1. Tanpa Perlu Login", "Pemohon tidak perlu membuat akun/password khusus. Cukup buka halaman web dan klik 'Buat Pengajuan'."),
        ("2. Nomor WhatsApp Valid", "Pastikan nomor HP ber-WhatsApp aktif. Sistem akan langsung mengirimkan konfirmasi kode booking ke nomor ini."),
        ("3. Pilihan Armada Mobil", "Hanya mobil yang berstatus TERSEDIA (Available) yang dapat dipilih pada jadwal yang ditentukan."),
        ("4. Simpan Kode Booking", "Setelah menekan 'Kirim', catat Kode Booking unik (misal: SIP-2Z6C9YRZ) untuk keperluan pemeriksaan dan serah kunci.")
    ]

    ny = ry + 80
    for num_title, desc in notes:
        draw.text((rx + 24, ny), num_title, fill=TEAL, font=get_font(15, bold=True))
        ny += 28
        # description lines
        wds = desc.split(" ")
        l1, l2 = "", ""
        for w in wds:
            if len(l1) + len(w) < 32:
                l1 += w + " "
            else:
                l2 += w + " "
        draw.text((rx + 24, ny), l1.strip(), fill=GRAY, font=get_font(13))
        draw.text((rx + 24, ny + 22), l2.strip(), fill=GRAY, font=get_font(13))
        ny += 60

    out_path = os.path.join(OUTPUT_DIR, "02_panduan_pemohon_formulir.png")
    img.save(out_path)
    return out_path

def create_img_03_notifikasi_whatsapp():
    """Panduan Langkah 2: Notifikasi WhatsApp Pemohon & Kepala Sekolah"""
    width, height = 1200, 780
    img = Image.new("RGB", (width, height), NAVY_LIGHT)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "NOTIFIKASI WHATSAPP REAL-TIME DARI SISTEM", "INTEGRASI OTOMATIS KE HP PEMOHON & KEPALA SEKOLAH", width, img=img)

    # Left: Smartphone Chat Pemohon
    w1_x, w1_y = 60, 120
    w_w, w_h = 510, 620
    draw_rounded_rect(draw, [w1_x, w1_y, w1_x + w_w, w1_y + w_h], radius=16, fill=WHITE, outline=BORDER, width=2)
    # Chat Header (WhatsApp Green)
    draw_rounded_rect(draw, [w1_x, w1_y, w1_x + w_w, w1_y + 70], radius=16, fill=(7, 94, 84))
    draw.rectangle([w1_x, w1_y + 50, w1_x + w_w, w1_y + 70], fill=(7, 94, 84))
    draw.text((w1_x + 24, w1_y + 14), "SIPKO SMKN 1 Subang", fill=WHITE, font=get_font(18, bold=True))
    draw.text((w1_x + 24, w1_y + 42), "Pesan Resmi Notifikasi Peminjaman", fill=(204, 251, 241), font=get_font(12))

    # Chat Bubble 1: Pemohon (Terima Kode Booking & Approval)
    cb1_x, cb1_y = w1_x + 20, w1_y + 90
    draw_rounded_rect(draw, [cb1_x, cb1_y, cb1_x + 470, cb1_y + 220], radius=10, fill=(220, 248, 198), outline=(180, 230, 160))
    msg_pemohon = (
        "Halo Bpk/Ibu Drs. Ahmad Hidayat,\n\n"
        "Pengajuan peminjaman kendaraan Anda telah kami terima:\n"
        "• Kode Booking : SIP-2Z6C9YRZ\n"
        "• Mobil        : Mobil Dinas 1 — Honda BR-V (D 1234 AB)\n"
        "• Tujuan       : Disdik Jabar, Bandung\n"
        "• Jadwal       : 21 Okt 2026, 08:00 WIB\n\n"
        "Saat ini pengajuan sedang menunggu peninjauan Kepala Sekolah."
    )
    draw.text((cb1_x + 16, cb1_y + 14), msg_pemohon, fill=DARK, font=get_font(13))

    # Chat Bubble 2: Disetujui
    cb2_y = cb1_y + 240
    draw_rounded_rect(draw, [cb1_x, cb2_y, cb1_x + 470, cb2_y + 240], radius=10, fill=(220, 248, 198), outline=(180, 230, 160))
    msg_approved = (
        "✅ KABAR BAIK: PENGAJUAN DISETUJUI!\n\n"
        "Kepala Sekolah telah MENYETUJUI peminjaman Anda.\n"
        "• Kode Booking: SIP-2Z6C9YRZ\n\n"
        "Silakan lakukan pemeriksaan awal saat serah terima kunci:\n"
        "1. Catat & foto angka speedometer awal.\n"
        "2. Ambil foto kondisi mobil di halaman Cek Booking:\n"
        "👉 https://sipko.smkn1subang.sch.id/cek-booking"
    )
    draw.text((cb1_x + 16, cb2_y + 14), msg_approved, fill=DARK, font=get_font(13))

    # Right: Smartphone Chat Kepala Sekolah
    w2_x = 630
    draw_rounded_rect(draw, [w2_x, w1_y, w2_x + w_w, w1_y + w_h], radius=16, fill=WHITE, outline=BORDER, width=2)
    # Chat Header Kepsek
    draw_rounded_rect(draw, [w2_x, w1_y, w2_x + w_w, w1_y + 70], radius=16, fill=(18, 140, 126))
    draw.rectangle([w2_x, w1_y + 50, w2_x + w_w, w1_y + 70], fill=(18, 140, 126))
    draw.text((w2_x + 24, w1_y + 14), "SIPKO Gateway -> Kepala Sekolah", fill=WHITE, font=get_font(18, bold=True))
    draw.text((w2_x + 24, w1_y + 42), "Pemberitahuan Permohonan Masuk", fill=(204, 251, 241), font=get_font(12))

    # Chat Bubble Kepsek
    cbk_x, cbk_y = w2_x + 20, w1_y + 90
    draw_rounded_rect(draw, [cbk_x, cbk_y, cbk_x + 470, cbk_y + 360], radius=10, fill=WHITE, outline=BORDER)
    msg_kepsek = (
        "Yth. Bapak/Ibu Kepala Sekolah SMKN 1 Subang,\n\n"
        "Terdapat permohonan pinjam mobil dinas baru:\n\n"
        "• Pemohon   : Drs. Ahmad Hidayat (Guru RPL)\n"
        "• Mobil     : Mobil Dinas 1 — Honda BR-V (D 1234 AB)\n"
        "• Tujuan    : Disdik Jabar, Bandung\n"
        "• Jadwal    : 21 Okt 2026, 08:00 WIB\n"
        "• Keperluan : Koordinasi Program SMK PK\n"
        "• Est. Jarak: 56.3 km (1 arah)\n\n"
        "Mohon tinjau & tentukan persetujuan melalui portal:\n"
        "👉 https://sipko.smkn1subang.sch.id/admin/pengajuan"
    )
    draw.text((cbk_x + 16, cbk_y + 18), msg_kepsek, fill=DARK, font=get_font(13))

    # Pill Info
    draw_rounded_rect(draw, [cbk_x, cbk_y + 380, cbk_x + 470, cbk_y + 490], radius=10, fill=TEAL_LIGHT, outline=TEAL)
    draw.text((cbk_x + 16, cbk_y + 395), "📌 Kepsek tidak perlu membuka berkas fisik", fill=TEAL, font=get_font(15, bold=True))
    draw.text((cbk_x + 16, cbk_y + 425), "Cukup klik link di chat WA untuk langsung menyetujui", fill=NAVY, font=get_font(13))
    draw.text((cbk_x + 16, cbk_y + 448), "atau menolak permohonan tersebut secara aman.", fill=NAVY, font=get_font(13))

    out_path = os.path.join(OUTPUT_DIR, "03_panduan_whatsapp_notifikasi.png")
    img.save(out_path)
    return out_path

def create_img_04_pemeriksaan_awal():
    """Panduan Langkah 3: Pemeriksaan Awal Odometer & Foto Fisik"""
    width, height = 1200, 780
    img = Image.new("RGB", (width, height), NAVY_LIGHT)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "PANDUAN PEMOHON: PEMERIKSAAN AWAL SEBELUM BERANGKAT", "LANGKAH 3: INPUT KM ODOMETER, FOTO SPEEDOMETER & FOTO MOBIL", width, img=img)

    # Left: Modal Form Upload Pemeriksaan Awal
    mx, my = 40, 120
    mw, mh = 640, 620
    draw_rounded_rect(draw, [mx, my, mx + mw, my + mh], radius=14, fill=WHITE, outline=BORDER, width=2)
    # Header
    draw_rounded_rect(draw, [mx, my, mx + mw, my + 60], radius=14, fill=AMBER_LIGHT)
    draw.rectangle([mx, my + 45, mx + mw, my + 60], fill=AMBER_LIGHT)
    draw.text((mx + 24, my + 18), "📷 Bukti Pemeriksaan Awal Kendaraan", fill=(180, 83, 9), font=get_font(18, bold=True))

    draw.text((mx + 24, my + 80), "Kilometer Awal (Odometer) *", fill=NAVY, font=get_font(14, bold=True))
    draw_rounded_rect(draw, [mx + 24, my + 105, mx + mw - 24, my + 150], radius=6, fill=NAVY_LIGHT, outline=BORDER)
    draw.text((mx + 36, my + 116), "93001   (Masukkan angka odometer dashboard)", fill=DARK, font=get_font(14))

    draw.text((mx + 24, my + 170), "Foto Speedometer Awal *", fill=NAVY, font=get_font(14, bold=True))
    draw_rounded_rect(draw, [mx + 24, my + 195, mx + mw - 24, my + 245], radius=6, fill=NAVY_LIGHT, outline=BORDER)
    draw.text((mx + 36, my + 208), "[Pilih File]  speedometer_awal_21okt.jpg  (Terpilih)", fill=TEAL, font=get_font(13, bold=True))

    draw.text((mx + 24, my + 265), "Foto Kondisi Kendaraan (Minimal 3 Foto) *", fill=NAVY, font=get_font(14, bold=True))
    draw_rounded_rect(draw, [mx + 24, my + 290, mx + mw - 24, my + 340], radius=6, fill=NAVY_LIGHT, outline=BORDER)
    draw.text((mx + 36, my + 303), "[Pilih File]  3 file terpilih (Interior, Jok Belakang, Eksterior)", fill=TEAL, font=get_font(13, bold=True))

    draw.text((mx + 24, my + 360), "Catatan Kerusakan Awal (Jika Ada)", fill=NAVY, font=get_font(14, bold=True))
    draw_rounded_rect(draw, [mx + 24, my + 385, mx + mw - 24, my + 455], radius=6, fill=NAVY_LIGHT, outline=BORDER)
    draw.text((mx + 36, my + 398), "Contoh: Baret halus di bumper kanan belakang dari pemakai sebelumnya.", fill=GRAY, font=get_font(12))

    # Submit Button
    draw_rounded_rect(draw, [mx + 24, my + 475, mx + mw - 24, my + 525], radius=8, fill=GREEN)
    draw.text((mx + mw//2 - 80, my + 488), "✓ KIRIM BUKTI AWAL", fill=WHITE, font=get_font(15, bold=True))

    # Next Step Button: Mulai Perjalanan
    draw_rounded_rect(draw, [mx + 24, my + 545, mx + mw - 24, my + 595], radius=8, fill=NAVY)
    draw.text((mx + mw//2 - 95, my + 558), "🚗 MULAI PERJALANAN", fill=WHITE, font=get_font(15, bold=True))

    # Right: Checklist & Tips
    rx, ry = 710, 120
    rw, rh = 450, 620
    draw_rounded_rect(draw, [rx, ry, rx + rw, ry + rh], radius=14, fill=WHITE, outline=BORDER, width=2)
    draw_rounded_rect(draw, [rx, ry, rx + rw, ry + 55], radius=14, fill=NAVY)
    draw.rectangle([rx, ry + 40, rx + rw, ry + 55], fill=NAVY)
    draw.text((rx + 24, ry + 16), "PANDUAN PEMERIKSAAN AWAL", fill=WHITE, font=get_font(18, bold=True))

    checklists = [
        ("1. Keakuratan Angka KM", "Pastikan angka yang diketik sesuai persis dengan angka di speedometer mobil agar riwayat servis valid."),
        ("2. Foto Speedometer Jelas", "Foto speedometer harus cukup terang dan angka kilometer terbaca tanpa pantulan silau cahaya."),
        ("3. Tiga Sudut Foto Mobil", "Ambil minimal 3 foto:\n • Interior dashboard depan\n • Jok penumpang / kebersihan\n • Bodi luar mobil"),
        ("4. Tombol Mulai Perjalanan", "Setelah bukti awal dikirim, tombol 'Mulai Perjalanan' akan muncul. Klik tombol tersebut saat mobil hendak keluar gerbang sekolah.")
    ]

    cy = ry + 80
    for title, desc in checklists:
        draw.text((rx + 24, cy), title, fill=TEAL, font=get_font(15, bold=True))
        cy += 26
        for line in desc.split("\n"):
            draw.text((rx + 24, cy), line.strip(), fill=GRAY, font=get_font(13))
            cy += 20
        cy += 14

    out_path = os.path.join(OUTPUT_DIR, "04_panduan_pemeriksaan_awal.png")
    img.save(out_path)
    return out_path

def create_img_05_persetujuan_kepsek():
    """Panduan Langkah 4: Persetujuan Kepala Sekolah"""
    width, height = 1200, 780
    img = Image.new("RGB", (width, height), NAVY_LIGHT)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "PANDUAN KEPALA SEKOLAH: PENINJAUAN & PERSETUJUAN", "PORTAL APPROVER — MENYETUJUI ATAU MENOLAK PENGAJUAN PINJAM MOBIL", width, img=img)

    # Portal Approval Mockup
    px, py = 80, 130
    pw, ph = 1040, 600
    draw_rounded_rect(draw, [px, py, px + pw, py + ph], radius=16, fill=WHITE, outline=BORDER, width=2)

    # Top Bar
    draw_rounded_rect(draw, [px, py, px + pw, py + 65], radius=16, fill=NAVY)
    draw.rectangle([px, py + 50, px + pw, py + 65], fill=NAVY)
    draw.text((px + 30, py + 20), "Detail Permohonan Peminjaman Kendaraan — SIP-2Z6C9YRZ", fill=WHITE, font=get_font(18, bold=True))

    # Status Badge
    draw_rounded_rect(draw, [px + pw - 250, py + 18, px + pw - 30, py + 48], radius=6, fill=AMBER)
    draw.text((px + pw - 240, py + 24), "MENUNGGU PERSETUJUAN", fill=WHITE, font=get_font(11, bold=True))

    # Grid Info
    left_x = px + 40
    right_x = px + 540

    info_left = [
        ("Nama Pemohon", "Drs. Ahmad Hidayat, M.Pd"),
        ("Jabatan / Unit", "Guru Pembina OSIS / Rekayasa Perangkat Lunak"),
        ("Nomor WhatsApp", "081234567890"),
        ("Mobil Dinas", "Mobil Dinas 1 — Honda BR-V (D 1234 AB)"),
    ]

    info_right = [
        ("Tujuan Perjalanan", "Dinas Pendidikan Provinsi Jawa Barat, Bandung"),
        ("Keperluan", "Koordinasi Penyelenggaraan Program SMK Pusat Keunggulan"),
        ("Waktu Berangkat", "Rabu, 21 Oktober 2026 pukul 08:00 WIB"),
        ("Waktu Kembali", "Rabu, 21 Oktober 2026 pukul 16:00 WIB (Sore)"),
    ]

    iy = py + 95
    for lbl, val in info_left:
        draw.text((left_x, iy), lbl, fill=GRAY, font=get_font(12, bold=True))
        draw.text((left_x, iy + 22), val, fill=DARK, font=get_font(15, bold=True))
        iy += 65

    iy = py + 95
    for lbl, val in info_right:
        draw.text((right_x, iy), lbl, fill=GRAY, font=get_font(12, bold=True))
        draw.text((right_x, iy + 22), val, fill=DARK, font=get_font(15, bold=True))
        iy += 65

    # Separator
    draw.line([px + 30, py + 375, px + pw - 30, py + 375], fill=BORDER, width=1)

    # Catatan Persetujuan
    draw.text((left_x, py + 395), "Catatan Persetujuan / Arahan Kepala Sekolah (Opsional):", fill=NAVY, font=get_font(13, bold=True))
    draw_rounded_rect(draw, [left_x, py + 425, px + pw - 40, py + 485], radius=6, fill=NAVY_LIGHT, outline=BORDER)
    draw.text((left_x + 16, py + 440), "Disetujui. Harap berhati-hati di jalan dan utamakan keselamatan rombongan.", fill=DARK, font=get_font(13))

    # Action Buttons
    # Tombol Setujui
    draw_rounded_rect(draw, [left_x, py + 515, left_x + 340, py + 570], radius=8, fill=GREEN)
    draw.text((left_x + 60, py + 530), "✓ SETUJUI PENGAJUAN", fill=WHITE, font=get_font(16, bold=True))

    # Tombol Tolak
    draw_rounded_rect(draw, [left_x + 360, py + 515, left_x + 650, py + 570], radius=8, fill=RED)
    draw.text((left_x + 430, py + 530), "✕ TOLAK PENGAJUAN", fill=WHITE, font=get_font(16, bold=True))

    # Info WA
    draw.text((left_x + 680, py + 532), "* WhatsApp otomatis dikirim ke pemohon", fill=GRAY, font=get_font(12))

    out_path = os.path.join(OUTPUT_DIR, "05_panduan_persetujuan_kepsek.png")
    img.save(out_path)
    return out_path

def create_img_06_pengembalian_dan_grafik():
    """Panduan Langkah 5: Pengembalian, Struk BBM & Grafik KM"""
    width, height = 780, 1200 # We will do standard width 1200, height 780
    width, height = 1200, 780
    img = Image.new("RGB", (width, height), NAVY_LIGHT)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "PENGEMBALIAN KENDARAAN & GRAFIK KM OTOMATIS", "LANGKAH 5 & 6: UPLOAD STRUK BBM, SELESAI, DAN UPDATE ODOMETER", width, img=img)

    # Left: Upload Pengembalian
    gx, gy = 40, 120
    gw, gh = 540, 620
    draw_rounded_rect(draw, [gx, gy, gx + gw, gy + gh], radius=14, fill=WHITE, outline=BORDER, width=2)
    draw_rounded_rect(draw, [gx, gy, gx + gw, gy + 55], radius=14, fill=TEAL_LIGHT)
    draw.rectangle([gx, gy + 40, gx + gw, gy + 55], fill=TEAL_LIGHT)
    draw.text((gx + 24, gy + 16), "📋 Upload Bukti Pengembalian Mobil", fill=TEAL, font=get_font(18, bold=True))

    ret_fields = [
        ("Kilometer Akhir (Odometer) *", "93120   (Bertambah +119 km)"),
        ("Foto Speedometer Akhir *", "[File] speedometer_kembali.jpg"),
        ("Foto Kondisi Mobil Setelah Dipakai *", "[File] 3 foto interior & eksterior"),
        ("Pengisian BBM?", "Ya, ada pengisian bensin"),
        ("Foto Struk / Nota Pembelian BBM", "[File] struk_spbu_pertamax.jpg"),
        ("Catatan Selama Perjalanan", "Perjalanan lancar, bensin terisi 20 liter."),
    ]

    ry = gy + 75
    for lbl, val in ret_fields:
        draw.text((gx + 24, ry), lbl, fill=NAVY, font=get_font(13, bold=True))
        draw_rounded_rect(draw, [gx + 24, ry + 22, gx + gw - 24, ry + 56], radius=6, fill=NAVY_LIGHT, outline=BORDER)
        draw.text((gx + 36, ry + 30), val, fill=DARK, font=get_font(13))
        ry += 68

    draw_rounded_rect(draw, [gx + 24, ry + 15, gx + gw - 24, ry + 62], radius=8, fill=TEAL)
    draw.text((gx + gw//2 - 120, ry + 28), "KIRIM BUKTI PENGEMBALIAN", fill=WHITE, font=get_font(15, bold=True))

    # Right: Grafik KM Otomatis
    rx, ry = 610, 120
    rw, rh = 550, 620
    draw_rounded_rect(draw, [rx, ry, rx + rw, ry + rh], radius=14, fill=WHITE, outline=BORDER, width=2)
    draw_rounded_rect(draw, [rx, ry, rx + rw, ry + 55], radius=14, fill=NAVY)
    draw.rectangle([rx, ry + 40, rx + rw, ry + 55], fill=NAVY)
    draw.text((rx + 24, ry + 16), "📈 GRAFIK KM & ODOMETER TERUPDATE", fill=WHITE, font=get_font(18, bold=True))

    # Simulated Chart Box
    draw_rounded_rect(draw, [rx + 24, ry + 80, rx + rw - 24, ry + 360], radius=10, fill=NAVY_LIGHT, outline=BORDER)
    draw.text((rx + 40, ry + 95), "Tren Kumulatif Jarak Tempuh Honda BR-V (D 1234 AB)", fill=NAVY, font=get_font(13, bold=True))
    draw.text((rx + 40, ry + 120), "Odometer Terakhir: 93,120 km  |  Total Pemakaian: 119 km", fill=TEAL, font=get_font(12, bold=True))

    # Chart Line Mockup (Draw points & gradient line)
    pts = [
        (rx + 60, ry + 320),
        (rx + 160, ry + 290),
        (rx + 260, ry + 260),
        (rx + 360, ry + 210),
        (rx + 460, ry + 160),
    ]
    # Draw line
    draw.line(pts, fill=TEAL, width=4)
    for p in pts:
        draw.ellipse([p[0]-6, p[1]-6, p[0]+6, p[1]+6], fill=WHITE, outline=TEAL, width=3)

    # Tooltip box on last point
    last_pt = pts[-1]
    draw_rounded_rect(draw, [last_pt[0] - 140, last_pt[1] - 60, last_pt[0] + 40, last_pt[1] - 12], radius=6, fill=DARK)
    draw.text((last_pt[0] - 130, last_pt[1] - 52), "+119 km (SIP-2Z6C9YRZ)", fill=WHITE, font=get_font(11, bold=True))
    draw.text((last_pt[0] - 130, last_pt[1] - 34), "Disdik Jabar — Selesai", fill=(153, 246, 228), font=get_font(10))

    # Metric Cards Below Chart
    my_top = ry + 380
    draw_rounded_rect(draw, [rx + 24, my_top, rx + 180, my_top + 80], radius=8, fill=WHITE, outline=BORDER)
    draw.text((rx + 36, my_top + 14), "93,120 km", fill=TEAL, font=get_font(18, bold=True))
    draw.text((rx + 36, my_top + 46), "Odometer Saat Ini", fill=GRAY, font=get_font(11))

    draw_rounded_rect(draw, [rx + 195, my_top, rx + 350, my_top + 80], radius=8, fill=WHITE, outline=BORDER)
    draw.text((rx + 207, my_top + 14), "+119 km", fill=GREEN, font=get_font(18, bold=True))
    draw.text((rx + 207, my_top + 46), "Total Perjalanan Ini", fill=GRAY, font=get_font(11))

    draw_rounded_rect(draw, [rx + 365, my_top, rx + rw - 24, my_top + 80], radius=8, fill=WHITE, outline=BORDER)
    draw.text((rx + 377, my_top + 14), "TERSEDIA", fill=NAVY, font=get_font(16, bold=True))
    draw.text((rx + 377, my_top + 46), "Status Mobil Kembali", fill=GRAY, font=get_font(11))

    # Explanation text
    draw.text((rx + 24, my_top + 105), "📌 Manfaat Otomatisasi Odometer:", fill=NAVY, font=get_font(14, bold=True))
    draw.text((rx + 24, my_top + 135), "1. Odometer mobil langsung terupdate tanpa staf perlu ketik manual.", fill=GRAY, font=get_font(12))
    draw.text((rx + 24, my_top + 160), "2. Riwayat jarak tempuh tersimpan rapi untuk jadwal ganti oli & servis.", fill=GRAY, font=get_font(12))
    draw.text((rx + 24, my_top + 185), "3. Siap diekspor ke format Laporan Resmi PDF & Excel untuk arsip.", fill=GRAY, font=get_font(12))

    out_path = os.path.join(OUTPUT_DIR, "06_panduan_pengembalian_dan_grafik.png")
    img.save(out_path)
    return out_path

if __name__ == "__main__":
    print("Generating tutorial images...")
    p1 = create_img_01_alur_lengkap()
    print("1:", p1)
    p2 = create_img_02_formulir_pemohon()
    print("2:", p2)
    p3 = create_img_03_notifikasi_whatsapp()
    print("3:", p3)
    p4 = create_img_04_pemeriksaan_awal()
    print("4:", p4)
    p5 = create_img_05_persetujuan_kepsek()
    print("5:", p5)
    p6 = create_img_06_pengembalian_dan_grafik()
    print("6:", p6)
    print("All tutorial images generated successfully!")
