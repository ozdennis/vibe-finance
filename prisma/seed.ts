// prisma/seed.ts - Works with PostgreSQL
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();
const MOCK_USER_ID = 'user_123';

async function main() {
  console.log('🗑️  DELETING ALL DATA...\n');
  
  // Delete in correct order (foreign keys)
  await prisma.auditLog.deleteMany({ where: { createdById: MOCK_USER_ID } });
  console.log('✅ Audit logs deleted');
  
  await prisma.transaction.deleteMany({ where: { createdById: MOCK_USER_ID } });
  console.log('✅ Transactions deleted');
  
  await prisma.category.deleteMany({ where: { createdById: MOCK_USER_ID } });
  console.log('✅ Categories deleted');
  
  await prisma.account.deleteMany({ where: { createdById: MOCK_USER_ID } });
  console.log('✅ Accounts deleted');
  
  console.log('\n✨ Database is now EMPTY!');
  console.log('\n📝 Next steps:');
  console.log('   1. Refresh browser (Ctrl+Shift+R)');
  console.log('   2. Go to Settings → Add Account');
  console.log('   3. Add initial balance via INCOME transaction');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
