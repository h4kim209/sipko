# SIPKO — Sistem Peminjaman Kendaraan Operasional
## SMKN 1 Subang

Aplikasi web manajemen peminjaman kendaraan operasional sekolah secara digital.  
Domain target: **sipko.smkn1subang.sch.id**

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | PostgreSQL 14+ |
| ORM | Prisma 6 |
| Auth | NextAuth v5 (JWT session) |
| Antrian | BullMQ + Redis |
| WhatsApp | @whiskeysockets/baileys |
| Peta | OpenStreetMap (Nominatim + OSRM) |
| CSS | Vanilla CSS (design system custom) |

---

## 🚀 Setup Development Lokal

### 1. Prasyarat
- Node.js >= 20
- PostgreSQL 14+ (berjalan lokal)
- Redis (opsional — untuk antrian BullMQ)

### 2. Clone & Install
```bash
git clone <repo>
cd sipko
npm install
```

### 3. Konfigurasi Environment
Salin `.env.example` ke `.env.local` lalu isi:
```bash
cp .env.example .env.local
```

Minimal yang **wajib** diisi:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sipko_db"
NEXTAUTH_SECRET="buat-string-acak-minimal-32-karakter"
UPLOAD_DIR="D:/sipko-uploads"
```

### 4. Buat Database & Jalankan Migrasi
```bash
createdb sipko_db
npm run db:migrate
npm run db:seed
```

**Akun default setelah seed:**

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@smkn1subang.sch.id | sipko@2024! |
| Approver (Kepsek) | kepsek@smkn1subang.sch.id | kepsek@2024! |

### 5. Jalankan Dev Server
```bash
npm run dev
# Buka http://localhost:3000
```

---

## 🔄 Alur Peminjaman Kendaraan

```
Pemohon mengisi form
         ↓
  MENUNGGU_PERSETUJUAN
         ↓ Admin/Approver menyetujui
      DISETUJUI
         ↓ (otomatis)
 MENUNGGU_PEMERIKSAAN_AWAL
         ↓ Pemohon upload foto + odometer awal
    SIAP_BERANGKAT
         ↓ Pemohon tekan "Mulai Perjalanan"
   SEDANG_DIGUNAKAN
         ↓ Pemohon upload foto + odometer akhir
MENUNGGU_PEMERIKSAAN_PENGEMBALIAN
         ↓ Admin review bukti
       SELESAI  (atau PERLU_PERBAIKAN_BUKTI)
```

---

## 📱 Integrasi WhatsApp (Baileys)

1. Set `WA_SESSION_DIR` di `.env.local`
2. Jalankan server
3. Buka `/api/whatsapp/qr` sebagai Super Admin
4. Scan QR code dengan HP pengirim WhatsApp
5. Setelah terhubung, sesi tersimpan otomatis

---

## 🚀 Deployment Produksi

```bash
# Build
npm run build

# PM2
pm2 start npm --name sipko -- start

# Nginx (reverse proxy ke port 3000)
# SSL via certbot --nginx -d sipko.smkn1subang.sch.id

# Migrasi produksi
npm run db:deploy
npm run db:seed
```

---

## 📋 Perintah Berguna

```bash
npm run dev          # Dev server
npm run build        # Build produksi
npm run typecheck    # Cek TypeScript
npm run db:migrate   # Buat migrasi (dev)
npm run db:deploy    # Terapkan migrasi (produksi)
npm run db:seed      # Isi data awal
npm run db:studio    # Prisma Studio (GUI database)
```
