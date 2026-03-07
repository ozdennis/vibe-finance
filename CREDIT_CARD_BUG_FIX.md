# 🔴 CRITICAL BUG FIX: Credit Card Debt Handling

## The Problem

Your credit card transactions were doing the **OPPOSITE** of what they should:

### When Creating an EXPENSE on Credit Card:
- ✅ **Correct**: Adds debt (balance increases)
- This was working fine!

### When DELETING an EXPENSE on Credit Card:
- ❌ **BROKEN**: Was ADDING more debt instead of removing it
- ✅ **Fixed**: Now correctly REMOVES debt

### When UPDATING an EXPENSE amount on Credit Card:
- ❌ **BROKEN**: Increasing expense was REDUCING debt
- ✅ **Fixed**: Now correctly increases debt when expense increases

## Root Cause

You have **TWO different delete functions** in your codebase:

1. **`src/features/finance/server/actions.ts`**
   - ✅ Has CORRECT credit card logic
   - Used by QuickLogDrawer (creating transactions)

2. **`src/features/finance/server/transaction-actions.ts`** ⚠️
   - ❌ Had BROKEN credit card logic
   - Used by TransactionHistory (editing/deleting transactions)

The TransactionHistory component was using the broken one!

## Technical Details

### How Credit Cards Work:
- **Balance = Debt** (amount you owe)
- **Expense** → Balance INCREASES (you owe more)
- **Payment** → Balance DECREASES (you owe less)

### Cash/E-Wallet (Normal Accounts):
- **Balance = Money you have**
- **Expense** → Balance DECREASES (you have less)
- **Income** → Balance INCREASES (you have more)

### The Bug in `transaction-actions.ts`:

**Before (BROKEN):**
```javascript
// Deleting an EXPENSE
if (transaction.type === "EXPENSE" && transaction.fromAccountId) {
  await tx.account.update({
    where: { id: transaction.fromAccountId },
    data: { 
      balance: { increment: transaction.amount },  // ❌ ALWAYS increment
    },
  });
}
```

This increments for ALL account types, which:
- ✅ Correct for Cash/E-Wallet (gives money back)
- ❌ **WRONG for Credit Cards** (adds MORE debt instead of reducing it!)

**After (FIXED):**
```javascript
// Deleting an EXPENSE
if (transaction.type === "EXPENSE" && transaction.fromAccountId) {
  const isCreditCard = transaction.fromAccount?.type === "CREDIT_CARD";
  await tx.account.update({
    where: { id: transaction.fromAccountId },
    data: { 
      balance: isCreditCard 
        ? { decrement: transaction.amount }  // ✅ CC: Reduce debt
        : { increment: transaction.amount }, // ✅ Cash: Add money back
    },
  });
}
```

## What Was Fixed

### 1. `deleteTransaction` function
Fixed balance rollback for:
- ✅ EXPENSE deletion on credit cards (now decrements debt)
- ✅ INCOME deletion on credit cards (now increments debt - reverses payment)
- ✅ TRANSFER deletion to credit cards (now increments debt - reverses payment)

### 2. `updateTransaction` function
Fixed balance adjustments when changing amount for:
- ✅ EXPENSE updates on credit cards (more expense = more debt)
- ✅ INCOME updates on credit cards (more payment = less debt)
- ✅ TRANSFER updates to credit cards (more payment = less debt)

## Example Scenario

**Scenario: Delete a 100k expense from credit card**

### Before Fix:
1. Initial CC balance: 500k (debt)
2. Created 100k expense → Balance = 600k ✅ (correct)
3. Delete that expense → Balance = 700k ❌ **BUG!** (added 100k more debt!)

### After Fix:
1. Initial CC balance: 500k (debt)
2. Created 100k expense → Balance = 600k ✅ (correct)
3. Delete that expense → Balance = 500k ✅ **FIXED!** (removed the debt)

## How to Test

### Test 1: Delete Expense
```
1. Start: Credit card has 100k debt
2. Create expense: 50k on credit card
3. Check: Balance should be 150k debt ✅
4. Delete that expense
5. Check: Balance should be 100k debt ✅ (not 200k!)
```

### Test 2: Update Expense Amount
```
1. Start: Credit card has 100k debt
2. Create expense: 50k on credit card → 150k debt
3. Edit expense to 80k
4. Check: Balance should be 180k debt ✅ (not 120k!)
```

### Test 3: Delete Payment (INCOME)
```
1. Start: Credit card has 100k debt
2. Make payment: 50k → 50k debt remaining
3. Delete that payment
4. Check: Balance should be 100k debt again ✅
```

## Files Fixed

### `/src/features/finance/server/transaction-actions.ts`

**Functions Updated:**
1. `updateTransaction()` - Lines 34-86
2. `deleteTransaction()` - Lines 145-202

**What Changed:**
- Added credit card type checking
- Used correct increment/decrement based on account type
- Added detailed comments explaining the logic

## Impact

### Before:
- ❌ Credit card debt would INCREASE when deleting expenses
- ❌ Credit card debt would DECREASE when increasing expenses
- ❌ Basically backwards for all credit card operations

### After:
- ✅ Credit card debt correctly DECREASES when deleting expenses
- ✅ Credit card debt correctly INCREASES when increasing expenses
- ✅ All credit card operations work logically

## Why This Happened

The developer wrote two separate transaction systems:
1. **Creation logic** in `actions.ts` - Implemented correctly with CC checks
2. **Edit/Delete logic** in `transaction-actions.ts` - Forgot to add CC checks

This is a common mistake when refactoring or when multiple people work on the same codebase.

## Prevention

### For Future Development:

1. **Centralize transaction logic**
   - Don't duplicate balance update code
   - Create a shared function: `adjustAccountBalance(account, amount, operation)`

2. **Add comprehensive tests**
   - Test each transaction type with each account type
   - Especially test the REVERSE operations (delete, update)

3. **Document the inverse relationship**
   ```javascript
   // CRITICAL: Credit cards have INVERTED balance logic
   // Balance = DEBT (not money!)
   // Expense INCREASES balance (more debt)
   // Payment DECREASES balance (less debt)
   ```

4. **Use TypeScript discriminated unions**
   ```typescript
   type BalanceUpdate = 
     | { accountType: 'CREDIT_CARD', operation: 'expense', action: 'increment' }
     | { accountType: 'CREDIT_CARD', operation: 'payment', action: 'decrement' }
     | { accountType: 'CASH', operation: 'expense', action: 'decrement' }
     // etc...
   ```

## Summary

This was a **critical bug** that made credit cards unusable. The fix ensures:

✅ Deleting credit card expenses removes debt (not adds it)
✅ Updating credit card expenses adjusts debt correctly
✅ Deleting credit card payments restores debt
✅ All operations maintain proper balance relationships

The bug only affected the **edit and delete** operations, not creation, which is why you saw transactions adding debt correctly but then deleting them made it worse!
