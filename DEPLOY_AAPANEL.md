# 🚀 Panduan Deployment SIPKO di Linux via aaPanel

Panduan lengkap instalasi dan deployment aplikasi **SIPKO** (Sistem Peminjaman Kendaraan Operasional) di server Linux (Ubuntu / Debian / CentOS / AlmaLinux) menggunakan panel kontrol **aaPanel**.

---

## 📋 1. Prasyarat di aaPanel

Pastikan modul-modul berikut telah terpasang di menu **App Store** aaPanel:
1. **Nginx** (versi 1.22 ke atas)
2. **MySQL / MariaDB** (MySQL 5.7 / 8.0 atau MariaDB 10.5+)
3. **Node.js Version Manager / Node project manager** (pilih Node.js versi **v20.x LTS** atau **v22.x LTS**)
4. **PM2 Manager** (biasanya terintegrasi otomatis dengan Node project)

---

## 🗄️ 2. Persiapan Database MySQL di aaPanel

1. Buka menu **Databases** di aaPanel.
2. Klik tombol **Add Database**:
   - **DB Name:** `sipko_db`
   - **DB Type:** `MySQL`
   - **Encoding:** `utf8mb4`
   - **Access Rights:** `Local server` (127.0.0.1)
   - Simpan Username dan Password yang dibuat.

---

## 📂 3. Unggah / Clone Kode Sumber ke Server

Di terminal server Linux (bisa via menu **Terminal** di aaPanel atau SSH):

```bash
# 1. Masuk ke direktori web root
cd /www/wwwroot

# 2. Clone repositori aplikasi (atau upload file zip jika tidak via git)
git clone <URL_REPO_ANDA> sipko
cd sipko

# 3. Buat folder penyimpanan uploads dan session WhatsApp jika belum ada
mkdir -p /www/wwwroot/sipko/uploads
mkdir -p /www/wwwroot/sipko/wa-session

# 4. Berikan hak akses ke user web server (www)
chown -R www:www /www/wwwroot/sipko
chmod -R 755 /www/wwwroot/sipko
```

---

## ⚙️ 4. Konfigurasi Environment (`.env.local`)

Salin file contoh dan sesuaikan:

```bash
cd /www/wwwroot/sipko
cp .env.example .env.local
nano .env.local
```

Isi variabel environment sesuai server Anda:

```env
# Database MySQL aaPanel
DATABASE_URL="mysql://NAMA_USER_DB:PASSWORD_DB@127.0.0.1:3306/sipko_db"

# Domain & NextAuth
NEXTAUTH_URL="https://sipko.smkn1subang.sch.id"
NEXTAUTH_SECRET="buat-string-acak-panjang-di-sini"
# Tips membuat secret acak di Linux: openssl rand -base64 32

# URL Aplikasi
APP_URL="https://sipko.smkn1subang.sch.id"
APP_NAME="SIPKO"
SCHOOL_NAME="SMKN 1 Subang"
SCHOOL_ADDRESS="Jl. Arief Rahman Hakim No.40, Sukarahayu, Kec. Subang, Kabupaten Subang, Jawa Barat 41212"
SCHOOL_LAT="-6.5694"
SCHOOL_LNG="107.7588"

# Path Penyimpanan File di Linux (Absolut)
UPLOAD_DIR="/www/wwwroot/sipko/uploads"
MAX_FILE_SIZE_MB="10"

# Sesi WhatsApp Baileys di Linux (Absolut)
WA_SESSION_DIR="/www/wwwroot/sipko/wa-session"
WA_ADMIN_NUMBERS=""

# Mode Produksi
NODE_ENV="production"
PORT=3000
```

---

## 📦 5. Install Dependencies & Build Aplikasi

Jalankan perintah berikut di dalam direktori `/www/wwwroot/sipko`:

```bash
# 1. Pastikan menggunakan Node.js v20+
node -v

# 2. Install dependensi
npm install --production=false

# 3. Jalankan migrasi database ke MySQL
npx prisma migrate deploy

# 4. Isi data awal (seed akun admin & kepsek default jika database masih baru)
npm run db:seed

# 5. Build aplikasi Next.js untuk produksi
npm run build
```

---

## 🌐 6. Konfigurasi Website & Reverse Proxy Nginx di aaPanel

1. Buka menu **Website** di aaPanel.
2. Klik **Add site**:
   - **Domain:** Masukkan domain Anda (misal: `sipko.smkn1subang.sch.id`)
   - **Root directory:** `/www/wwwroot/sipko`
   - Klik **Submit**.
3. Pasang **SSL (HTTPS)**:
   - Klik nama website -> tab **SSL** -> pilih **Let's Encrypt** -> klik **Apply**.
4. Atur **Reverse Proxy**:
   - Di pengaturan website, pilih menu **Reverse Proxy** -> klik **Add reverse proxy**:
   - **Proxy name:** `sipko_proxy`
   - **Target URL:** `http://127.0.0.1:3000`
   - **Sent Domain:** `$host`
5. Atur **Nginx Config** untuk Upload Besar & WebSocket:
   - Masuk ke tab **Config** website Nginx Anda, pastikan ada baris:
   ```nginx
   client_max_body_size 25M;
   ```
   - Pastikan blok location proxy memiliki WebSocket header:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

---

## 🚀 7. Menjalankan Aplikasi dengan PM2

Aplikasi ini sudah dilengkapi file konfigurasi PM2 (`ecosystem.config.cjs`).

### Opsi A — Melalui Terminal SSH:
```bash
cd /www/wwwroot/sipko
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Opsi B — Melalui aaPanel Node Project Manager:
1. Buka menu **Website** -> tab **Node project**.
2. Klik **Add Node project**:
   - **Project name:** `sipko`
   - **Path:** `/www/wwwroot/sipko`
   - **Run opt:** Pilih `start` (atau jalankan script `ecosystem.config.cjs`)
   - **Port:** `3000`
   - **Node version:** Node v20.x
3. Klik **Submit**. Project akan langsung berjalan dan statusnya menjadi **Running**.

---

## 📱 8. Verifikasi & Scan WhatsApp

1. Buka browser: `https://sipko.smkn1subang.sch.id/login`
2. Login dengan akun Admin / Super Admin.
3. Masuk ke menu **WhatsApp Gateway** (`/admin/whatsapp`).
4. Klik **Koneksikan** untuk memunculkan QR Code (atau gunakan tab **Pairing Code** 8 digit).
5. Scan melalui aplikasi WhatsApp di HP pengirim.
6. Notifikasi otomatis siap dikirim ke pemohon dan Kepala Sekolah!
