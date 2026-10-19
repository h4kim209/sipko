const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { id: 'system' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: 'system',
        name: 'Sistem SIPKO',
        email: 'system@sipko.local',
        role: 'SUPER_ADMIN',
        isActive: true,
      }
    });
    console.log('Created system user');
  } else {
    console.log('System user already exists');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
