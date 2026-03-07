// src/features/finance/services/FinanceService.ts
import { db } from "@/lib/db";

export const FinanceService = {
  /**
   * Performs an atomic transfer between two accounts.
   * Ensures 'Net Liquidity' remains unchanged while updating individual balances.
   */
  async transferFunds(data: {
    fromId: string;
    toId: string;
    amount: number;
    userId: string;
  }) {
    return await db.$transaction(async (tx) => {
      // 1. Deduct from source
      const source = await tx.account.update({
        where: { id: data.fromId, createdById: data.userId },
        data: { balance: { decrement: data.amount } },
      });

      // 2. Add to target
      const target = await tx.account.update({
        where: { id: data.toId, createdById: data.userId },
        data: { balance: { increment: data.amount } },
      });

      // 3. Create the ledger entry
      const ledger = await tx.transaction.create({
        data: {
          amount: data.amount,
          type: "TRANSFER",
          date: new Date(), // Use current date for transfers
          fromAccountId: data.fromId,
          toAccountId: data.toId,
          createdById: data.userId,
          description: `Internal Transfer: ${source.name} to ${target.name}`,
        },
      });

      return { source, target, ledger };
    });
  },

  /**
   * Calculates Net Liquidity: (Cash + E-Wallets) - Credit Card Debt
   * This is the "Real Money" metric users need to avoid overspending.
   */
  async getNetLiquidity(userId: string) {
    const accounts = await db.account.findMany({
      where: { createdById: userId, deletedAt: null },
    });

    const cash = accounts
      .filter((a) => a.type === "CASH" || a.type === "E_WALLET")
      .reduce((acc, curr) => acc + Number(curr.balance), 0);

    const debt = accounts
      .filter((a) => a.type === "CREDIT_CARD")
      .reduce((acc, curr) => acc + Number(curr.balance), 0);

    const investments = accounts
      .filter((a) => a.type === "INVESTMENT")
      .reduce((acc, curr) => acc + Number(curr.balance), 0);

    return {
      accounts,
      netLiquidity: cash - debt,
      cashTotal: cash,
      debtTotal: debt,
      investmentsTotal: investments,
    };
  },
};
