const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE vehicle_inspections MODIFY submittedById VARCHAR(191) NULL');
  await prisma.$executeRawUnsafe('ALTER TABLE inspection_photos MODIFY uploadedById VARCHAR(191) NULL');
  console.log('Successfully altered columns to NULL');
}

main().catch(console.error).finally(() => prisma.$disconnect());
