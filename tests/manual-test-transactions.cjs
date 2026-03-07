// tests/manual-test-transactions.js
// Run this with: node tests/manual-test-transactions.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_ID = 'user_123';

async function testTransactions() {
  console.log('🧪 Testing Transaction System\n');
  
  try {
    // Get initial balances
    const initialAccounts = await prisma.account.findMany({
      where: { createdById: USER_ID },
      orderBy: { name: 'asc' }
    });
    
    console.log('📊 Initial Account Balances:');
    initialAccounts.forEach(acc => {
      console.log(`   ${acc.name} (${acc.type}): Rp ${acc.balance.toLocaleString('id-ID')}`);
    });
    
    // Test 1: Create INCOME transaction
    console.log('\n✅ Test 1: Creating INCOME transaction...');
    const incomeResult = await prisma.transaction.create({
      data: {
        amount: 1000000,
        type: 'INCOME',
        description: 'Test income',
        date: new Date(),
        toAccountId: initialAccounts.find(a => a.type === 'CASH')?.id,
        createdById: USER_ID,
      }
    });
    console.log(`   Created transaction: ${incomeResult.id}`);
    
    // Check balance after income
    const cashAccount = await prisma.account.findFirst({
      where: { type: 'CASH', createdById: USER_ID },
      orderBy: { createdAt: 'asc' }
    });
    console.log(`   Cash account balance after income: Rp ${cashAccount.balance.toLocaleString('id-ID')}`);
    
    // Test 2: Create EXPENSE transaction
    console.log('\n❌ Test 2: Creating EXPENSE transaction...');
    const expenseResult = await prisma.transaction.create({
      data: {
        amount: 50000,
        type: 'EXPENSE',
        description: 'Test expense',
        date: new Date(),
        fromAccountId: cashAccount.id,
        createdById: USER_ID,
      }
    });
    console.log(`   Created transaction: ${expenseResult.id}`);
    
    // Check balance after expense
    const cashAccountAfter = await prisma.account.findUnique({
      where: { id: cashAccount.id }
    });
    console.log(`   Cash account balance after expense: Rp ${cashAccountAfter.balance.toLocaleString('id-ID')}`);
    
    // Test 3: Create TRANSFER transaction
    console.log('\n🔄 Test 3: Creating TRANSFER transaction...');
    const savingsAccount = await prisma.account.findFirst({
      where: { name: 'BCA', createdById: USER_ID }
    });
    
    const transferResult = await prisma.transaction.create({
      data: {
        amount: 200000,
        type: 'TRANSFER',
        description: 'Test transfer',
        date: new Date(),
        fromAccountId: cashAccount.id,
        toAccountId: savingsAccount.id,
        createdById: USER_ID,
      }
    });
    console.log(`   Created transaction: ${transferResult.id}`);
    
    // Check balances after transfer
    const cashAfterTransfer = await prisma.account.findUnique({
      where: { id: cashAccount.id }
    });
    const savingsAfterTransfer = await prisma.account.findUnique({
      where: { id: savingsAccount.id }
    });
    console.log(`   Cash account after transfer: Rp ${cashAfterTransfer.balance.toLocaleString('id-ID')}`);
    console.log(`   Savings account after transfer: Rp ${savingsAfterTransfer.balance.toLocaleString('id-ID')}`);
    
    // Test 4: Delete transaction (rollback)
    console.log('\n🗑️  Test 4: Deleting INCOME transaction (testing rollback)...');
    await prisma.transaction.delete({
      where: { id: incomeResult.id }
    });
    
    const cashAfterDelete = await prisma.account.findUnique({
      where: { id: cashAccount.id }
    });
    console.log(`   Cash account after delete rollback: Rp ${cashAfterDelete.balance.toLocaleString('id-ID')}`);
    
    console.log('\n✅ All tests completed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTransactions();
