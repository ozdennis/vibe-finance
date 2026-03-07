// src/app/api/settings-data/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MOCK_USER_ID = "user_123";

export async function GET() {
  try {
    const [accounts, categories] = await Promise.all([
      db.account.findMany({
        where: { createdById: MOCK_USER_ID, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          balance: true,
          creditLimit: true,
        },
      }),
      db.category.findMany({
        where: { createdById: MOCK_USER_ID },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      }),
    ]);

    // Convert Decimal to number for JSON serialization
    const serializedAccounts = accounts.map(acc => ({
      ...acc,
      balance: Number(acc.balance),
      creditLimit: acc.creditLimit ? Number(acc.creditLimit) : null,
    }));

    return NextResponse.json({ accounts: serializedAccounts, categories });
  } catch (error) {
    console.error("Failed to load settings data:", error);
    return NextResponse.json(
      { error: "Failed to load settings data" },
      { status: 500 }
    );
  }
}
