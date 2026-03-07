# Role: Senior Next.js 16 & Prisma 6 System Architect
# Task: Build "Vibe Finance OS" with FBA-SOLID-SSOT Architecture

Act as an expert engineer. Build the "Finance" feature-set using Next.js 16 (App Router), Prisma 6, Tailwind 4, and Gemini 1.5 Flash.

## 1. Database Foundation (Improved Artifact 1)
Create `prisma/schema/finance.prisma`. Implement a multi-tenant ledger:
- **Account Model**: id, name, type (CASH, E_WALLET, CC, INVESTMENT), balance (Decimal), creditLimit (Decimal), currency (default: IDR), createdById.
- **Transaction Model**: id, amount (Decimal), type (INCOME, EXPENSE, TRANSFER), fromAccountId, toAccountId, description, metadata (JSON for AI results), isTaxDeductible, createdById.
- **Indexes**: Add @@index on [createdById] and [type] for 100ms response times at scale.

## 2. Core Service Layer (Atomic Logic)
Create `src/features/finance/services/FinanceService.ts`:
- **Atomic Transfers**: Implement a db.$transaction that decrements Source and increments Target in one step.
- **Net Liquidity Engine**: Create a query that calculates: (Σ Cash + Σ E-Wallets) - (Σ Unpaid CC Balance). Label this "Real Money".

## 3. Mobile-First UX (Zero-Friction)
Create the following components in `src/features/finance/components/`:
- **NetLiquidityHero**: A high-impact dashboard header showing "Real Money".
- **QuickLogDrawer**: Use the 'vaul' library for a native bottom sheet. 
- **The Numpad Trigger**: Force `inputmode="decimal"` on the amount field. Focus this field automatically when the drawer opens.
- **Fuzzy Search**: Use `fuse.js` for the Category dropdown to handle typos.

## 4. AI Vision Integration (The Receipt Scanner)
Create a Server Action `src/features/finance/server/ai-actions.ts`:
- **Gemini Integration**: Use `@google/generative-ai`.
- **Logic**: Accept a base64 image. Prompt Gemini 1.5 Flash to return JSON: { amount: number, merchant: string, category: string, date: string }.
- **Friction Reduction**: Automatically populate the QuickLogDrawer fields with these AI results.

## 5. Technical Hygiene & PWA
- **PWA Support**: Generate a manifest.json and register a service worker for "Add to Home Screen" capability.
- **RBAC**: Every query/mutation must strictly filter by the authenticated user session ID.
- **Loading States**: Implement React Suspense with skeleton loaders for the Account cards.

## 6. Execution Instructions
1. Initialize the Prisma models and push to the DB.
2. Build the Service and Server Action logic first.
3. Build the UI components following the 'Industrial Utilitarian' dark-mode theme.
4. Output a clean folder structure under `src/features/finance/`.