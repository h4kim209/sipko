// prisma/seed.ts — Database seed: super admin + kendaraan contoh

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Mulai seeding database SIPKO...')

  // 1. Super Admin
  const adminEmail = 'admin@smkn1subang.sch.id'
  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail } })

  if (!existingAdmin) {
    const hash = await bcrypt.hash('sipko@2024!', 12)
    await prisma.user.create({
      data: {
        name: 'Administrator SIPKO',
        email: adminEmail,
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        isActive: true,
        phoneWa: '628123456789',
      },
    })
    console.log('  ✅ Super Admin dibuat: admin@smkn1subang.sch.id / sipko@2024!')
  } else {
    console.log('  ℹ️  Super Admin sudah ada, skip.')
  }

  // 2. Approver (Kepala Sekolah)
  const approverEmail = 'kepsek@smkn1subang.sch.id'
  const existingApprover = await prisma.user.findFirst({ where: { email: approverEmail } })

  if (!existingApprover) {
    const hash = await bcrypt.hash('kepsek@2024!', 12)
    await prisma.user.create({
      data: {
        name: 'Kepala Sekolah SMKN 1 Subang',
        email: approverEmail,
        passwordHash: hash,
        role: 'APPROVER',
        isActive: true,
        phoneWa: '628987654321',
      },
    })
    console.log('  ✅ Approver dibuat: kepsek@smkn1subang.sch.id / kepsek@2024!')
  } else {
    console.log('  ℹ️  Approver sudah ada, skip.')
  }

  // 3. Kendaraan Contoh
  const vehicleData = [
    {
      name: 'Mobil Dinas 1',
      brand: 'Toyota',
      type: 'MPV',
      plateNumber: 'D 1234 AB',
      year: 2022,
      color: 'Putih',
      fuelType: 'Bensin',
      seatCapacity: 7,
      currentOdometer: 25430,
      status: 'AVAILABLE' as const,
    },
    {
      name: 'Mobil Dinas 2',
      brand: 'Toyota',
      type: 'MPV',
      plateNumber: 'D 5678 CD',
      year: 2021,
      color: 'Hitam',
      fuelType: 'Bensin',
      seatCapacity: 7,
      currentOdometer: 42100,
      status: 'AVAILABLE' as const,
    },
    {
      name: 'Pickup Operasional',
      brand: 'Mitsubishi',
      type: 'Pickup',
      plateNumber: 'D 9012 EF',
      year: 2020,
      color: 'Silver',
      fuelType: 'Solar',
      seatCapacity: 3,
      currentOdometer: 67800,
      status: 'AVAILABLE' as const,
    },
    {
      name: 'Minibus Kegiatan',
      brand: 'Isuzu',
      type: 'Minibus',
      plateNumber: 'D 3456 GH',
      year: 2019,
      color: 'Biru',
      fuelType: 'Solar',
      seatCapacity: 16,
      currentOdometer: 95200,
      status: 'AVAILABLE' as const,
    },
  ]

  for (const v of vehicleData) {
    const existing = await prisma.vehicle.findFirst({
      where: { plateNumber: v.plateNumber, deletedAt: null },
    })
    if (!existing) {
      await prisma.vehicle.create({ data: v })
      console.log(`  ✅ Kendaraan: ${v.name} (${v.plateNumber})`)
    } else {
      console.log(`  ℹ️  ${v.name} sudah ada, skip.`)
    }
  }

  // 4. Pengaturan sistem default
  const settings = [
    { key: 'school_name', value: 'SMKN 1 Subang', description: 'Nama instansi' },
    { key: 'school_address', value: 'Jl. Arief Rahman Hakim No.40, Sukarahayu, Kec. Subang, Kabupaten Subang, Jawa Barat 41212', description: 'Alamat sekolah' },
    { key: 'school_lat', value: '-6.5694', description: 'Latitude sekolah' },
    { key: 'school_lng', value: '107.7588', description: 'Longitude sekolah' },
    { key: 'app_name', value: 'SIPKO', description: 'Nama aplikasi' },
    { key: 'max_booking_days_ahead', value: '30', description: 'Maks hari ke depan untuk booking' },
    { key: 'min_inspection_photos', value: '3', description: 'Minimum foto inspeksi' },
  ]

  for (const s of settings) {
    const existing = await prisma.systemSetting.findFirst({ where: { key: s.key } })
    if (!existing) {
      await prisma.systemSetting.create({ data: s })
    }
  }
  console.log('  ✅ Pengaturan sistem default dibuat.')

  console.log('')
  console.log('🎉 Seeding selesai!')
  console.log('')
  console.log('  Login Admin:')
  console.log('  Email   : admin@smkn1subang.sch.id')
  console.log('  Password: sipko@2024!')
  console.log('')
  console.log('  Login Approver (Kepala Sekolah):')
  console.log('  Email   : kepsek@smkn1subang.sch.id')
  console.log('  Password: kepsek@2024!')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
