const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const accounts = await prisma.account.findMany({
    where: { createdById: 'user_123' }
  });
  
  console.log('Accounts for user_123:', accounts.length);
  accounts.forEach(a => console.log(`  - ${a.id}: ${a.name} (${a.type})`));
  
  await prisma.$disconnect();
}

check();
