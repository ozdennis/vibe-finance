// src/features/finance/constants/schemas.ts
import { z } from "zod";

export const TransactionSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(999999999, "Amount exceeds maximum allowed"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  accountId: z.string().min(1, "Please select an account"),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().max(500, "Description too long").optional(),
  date: z.string().optional(), // ISO date string
  userId: z.string().min(1, "User ID is required"),
});

export const TransferSchema = z.object({
  fromId: z.string().min(1, "Source account required"),
  toId: z.string().min(1, "Target account required"),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(999999999, "Amount exceeds maximum allowed"),
  userId: z.string().min(1, "User ID is required"),
  description: z.string().max(500, "Description too long").optional(),
});

export const ReceiptParseSchema = z.object({
  amount: z.number().positive(),
  merchant: z.string(),
  category: z.enum([
    "FOOD",
    "TRANSPORT",
    "SHOPPING",
    "ENTERTAINMENT",
    "UTILITIES",
    "HEALTHCARE",
    "GROCERIES",
    "OTHER",
  ]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  currency: z.string().default("IDR"),
});

export const AccountSchema = z.object({
  name: z.string().min(1, "Account name required").max(100),
  type: z.enum(["CASH", "E_WALLET", "CREDIT_CARD", "INVESTMENT"]),
  balance: z.coerce.number().default(0),
  creditLimit: z.coerce.number().optional(),
  currency: z.string().default("IDR"),
});
