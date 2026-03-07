const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const count = await prisma.transaction.count();
  console.log('Transaction count:', count);
  
  const recent = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  
  console.log('\nRecent transactions:');
  recent.forEach(tx => {
    console.log(`  - ${tx.type}: Rp ${tx.amount} (${tx.description || 'no desc'})`);
  });
  
  await prisma.$disconnect();
}

checkData();
