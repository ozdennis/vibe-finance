// prisma/seed.ts - Seed initial data for Vibe Finance
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();
const MOCK_USER_ID = 'user_123';

async function main() {
  console.log('🌱 Seeding database for Vibe Finance...\n');

  // Create default categories
  const categories = [
    { name: 'FOOD', color: '#f59e0b' },
    { name: 'TRANSPORT', color: '#3b82f6' },
    { name: 'SHOPPING', color: '#ec4899' },
    { name: 'ENTERTAINMENT', color: '#8b5cf6' },
    { name: 'UTILITIES', color: '#10b981' },
    { name: 'HEALTHCARE', color: '#ef4444' },
    { name: 'GROCERIES', color: '#f97316' },
    { name: 'SALARY', color: '#10b981' },
    { name: 'INVESTMENT', color: '#6366f1' },
    { name: 'PLASTIC REVENUE', color: '#06b6d4' },  // For business tax calculation
    { name: 'AFFILIATE', color: '#8b5cf6' },
    { name: 'AFFILIATE COST', color: '#f43f5e' },
    { name: 'INTEREST INCOME', color: '#10b981' },  // For interest postings
    { name: 'INTEREST TAX WITHHELD', color: '#f59e0b' },  // For tax on interest
    { name: 'DEPOSIT PENALTY', color: '#f43f5e' },  // For early withdrawal penalty
    { name: 'OTHER', color: '#6b7280' },
  ];

  console.log('📁 Creating categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { 
        name_createdById: {
          createdById: MOCK_USER_ID,
          name: cat.name,
        }
      },
      update: {},
      create: {
        name: cat.name,
        color: cat.color,
        createdById: MOCK_USER_ID,
      },
    });
  }
  console.log(`✅ Created ${categories.length} categories\n`);

  // Create default accounts
  const accounts = [
    { name: 'Cash Wallet', type: 'CASH', balance: 1000000 },
    { name: 'BCA', type: 'CASH', balance: 5000000 },
    { name: 'GoPay', type: 'E_WALLET', balance: 500000 },
    { name: 'OVO', type: 'E_WALLET', balance: 300000 },
  ];

  console.log('💳 Creating accounts...');
  for (const acc of accounts) {
    const existing = await prisma.account.findFirst({
      where: { name: acc.name, createdById: MOCK_USER_ID },
    });
    
    if (!existing) {
      await prisma.account.create({
        data: {
          name: acc.name,
          type: acc.type as any,
          balance: acc.balance,
          currency: 'IDR',
          createdById: MOCK_USER_ID,
        },
      });
    }
  }
  console.log(`✅ Created ${accounts.length} accounts\n`);

  // Create sample transactions
  const cashAccount = await prisma.account.findFirst({
    where: { name: 'Cash Wallet', createdById: MOCK_USER_ID },
  });

  const bcaAccount = await prisma.account.findFirst({
    where: { name: 'BCA', createdById: MOCK_USER_ID },
  });

  const gopayAccount = await prisma.account.findFirst({
    where: { name: 'GoPay', createdById: MOCK_USER_ID },
  });

  const foodCategory = await prisma.category.findFirst({
    where: { name: 'FOOD', createdById: MOCK_USER_ID },
  });

  const salaryCategory = await prisma.category.findFirst({
    where: { name: 'SALARY', createdById: MOCK_USER_ID },
  });

  console.log('📝 Creating sample transactions...');
  
  const today = new Date();
  
  // Sample transactions
  const transactions = [
    {
      amount: 50000,
      type: 'EXPENSE',
      description: 'Lunch at warung',
      categoryId: foodCategory?.id,
      fromAccountId: cashAccount?.id,
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
    },
    {
      amount: 100000,
      type: 'EXPENSE',
      description: 'Gojek ride',
      categoryId: await prisma.category.findFirst({ where: { name: 'TRANSPORT', createdById: MOCK_USER_ID } }).then(c => c?.id),
      fromAccountId: gopayAccount?.id,
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      amount: 5000000,
      type: 'INCOME',
      description: 'Monthly salary',
      categoryId: salaryCategory?.id,
      toAccountId: bcaAccount?.id,
      date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        ...tx,
        createdById: MOCK_USER_ID,
        updatedById: MOCK_USER_ID,
      } as any,
    });
  }
  
  console.log(`✅ Created ${transactions.length} sample transactions\n`);

  console.log('✨ Database seeding complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Refresh browser (Ctrl+Shift+R for hard refresh)');
  console.log('   2. You should see your accounts and transactions');
  console.log('   3. Go to Settings to add more accounts/categories');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
