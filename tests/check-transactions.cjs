const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== CHECKING TRANSACTIONS ===\n');
  
  const transactions = await prisma.transaction.findMany({
    where: { createdById: 'user_123' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: {
      fromAccount: true,
      toAccount: true,
    }
  });
  
  console.log('Recent transactions:');
  transactions.forEach(tx => {
    console.log(`  ${tx.type}: Rp ${tx.amount.toLocaleString('id-ID')}`);
    console.log(`    Description: ${tx.description || 'N/A'}`);
    console.log(`    From: ${tx.fromAccount?.name || 'N/A'}`);
    console.log(`    To: ${tx.toAccount?.name || 'N/A'}`);
    console.log(`    Date: ${tx.date}`);
    console.log('');
  });
  
  console.log('\n=== CHECKING ACCOUNT BALANCES ===\n');
  const accounts = await prisma.account.findMany({
    where: { createdById: 'user_123', deletedAt: null },
    orderBy: { name: 'asc' }
  });
  
  accounts.forEach(acc => {
    console.log(`  ${acc.name} (${acc.type}): Rp ${acc.balance.toLocaleString('id-ID')}`);
  });
  
  // Calculate expected net liquidity
  const cash = accounts.filter(a => a.type === 'CASH' || a.type === 'E_WALLET')
    .reduce((sum, a) => sum + Number(a.balance), 0);
  const debt = accounts.filter(a => a.type === 'CREDIT_CARD')
    .reduce((sum, a) => sum + Number(a.balance), 0);
  
  console.log(`\n  Cash & E-Wallets: Rp ${cash.toLocaleString('id-ID')}`);
  console.log(`  Credit Card Debt: Rp ${debt.toLocaleString('id-ID')}`);
  console.log(`  Net Liquidity: Rp ${(cash - debt).toLocaleString('id-ID')}`);
  
  await prisma.$disconnect();
}

check();
