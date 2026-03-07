# Vibe Finance - Project Index

> Auto-generated project structure index  
> Last updated: 2026-03-07

---

## Project Overview

**Vibe Finance** is a mobile-first personal wealth operating system built with Next.js 16, Prisma 6, and Tailwind CSS 4. It provides real-time net liquidity tracking to solve "balance delusion" by aggregating cash, e-wallets, and credit card debt.

---

## Directory Structure

```
f:\Work\Gemini Finance\
├───.next/                    # Next.js build output
├───.qwen/                    # Qwen Code configuration
├───node_modules/             # Dependencies
├───playwright-report/        # Test reports
├───prisma/                   # Database schema & seeding
├───public/                   # Static assets & PWA files
├───src/                      # Source code
│   ├───app/                  # Next.js App Router
│   ├───features/             # Feature-based modules
│   └───lib/                  # Shared utilities
└───tests/                    # Playwright tests
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies & scripts |
| `tsconfig.json` | TypeScript configuration |
| `next.config.js` | Next.js configuration |
| `postcss.config.js` | PostCSS configuration |
| `playwright.config.ts` | E2E test configuration |
| `vercel.json` | Vercel deployment config |
| `manifest.json` | PWA manifest |
| `.env.example` | Environment variables template |

---

## Documentation Files

| File | Purpose |
|------|---------|
| `QWEN.md` | **Primary project context & conventions** |
| `Master PRD_Vibe-Finance.md` | Product Requirements Document |
| `Design Brief_Vibe-Finance Mobile Command.md` | Design specifications |
| `FBA Folder Structure.md` | Feature-Based Architecture guide |
| `Vibe-Finance Build Plan.md` | Build roadmap & phases |
| `MVP Preview.md` | MVP feature overview |
| `The Master Orchestration.md` | Orchestration patterns |
| `CREDIT_CARD_BUG_FIX.md` | Bug fix documentation |
| `PROJECT_INDEX.md` | This file |

---

## Database Layer (`/prisma`)

```
prisma/
├── schema/
│   └── finance.prisma        # Finance domain schema
├── schema.prisma             # Main Prisma schema (imports finance)
└── seed.ts                   # Database seeding script
```

### Core Models

- **Account** - Cash, E-Wallet, Credit Card, Investment accounts
- **Transaction** - Income, Expense, Transfer records
- **Category** - Transaction categorization
- **AuditLog** - Change tracking for SSOT compliance
- **CreditCardStatement** - CC statement management

---

## Application Layer (`/src/app`)

```
src/app/
├── api/
│   └── settings-data/        # API routes
├── audit/
│   └── page.tsx              # Audit log viewer page
├── settings/
│   └── page.tsx              # Settings page
├── statements/
│   └── page.tsx              # CC statements page
├── share/
│   └── route.ts              # Share API route
├── globals.css               # Global styles
├── layout.tsx                # Root layout
├── loading.tsx               # Loading state (Global Skeleton)
└── page.tsx                  # Home/Dashboard page
```

---

## Feature Layer (`/src/features/finance`)

### Components (`/components`)

| Component | Purpose |
|-----------|---------|
| `Dashboard.tsx` | Main dashboard container |
| `NetLiquidityHero.tsx` | "Real Money" display card |
| `QuickLogDrawer.tsx` | Mobile transaction input (vaul) |
| `AccountGrid.tsx` | Horizontal account scrolling |
| `AccountManager.tsx` | CRUD for accounts |
| `CategoryManager.tsx` | Category management UI |
| `CategorySearch.tsx` | Fuzzy category search (fuse.js) |
| `TransactionHistory.tsx` | Transaction list view |
| `MonthlyTrendChart.tsx` | Spending trends visualization |
| `TaxMeter.tsx` | Tax projection widget |
| `CreditCardWidget.tsx` | CC debt summary |
| `CreditCardStatementManager.tsx` | Statement management |
| `AuditLogViewer.tsx` | Audit trail viewer |
| `PWAProvider.tsx` | PWA configuration provider |
| `ErrorBoundary.tsx` | Error handling |

### Server Actions (`/server`)

| File | Purpose |
|------|---------|
| `actions.ts` | Core transaction mutations |
| `account-actions.ts` | Account CRUD operations |
| `transaction-actions.ts` | Transaction operations |
| `category-actions.ts` | Category operations |
| `statement-actions.ts` | CC statement operations |
| `ai-actions.ts` | Gemini receipt parsing |
| `queries.ts` | Data fetching (Net Liquidity, trends) |

### Services (`/services`)

| File | Purpose |
|------|---------|
| `FinanceService.ts` | Business logic, atomic transfers |

### Hooks (`/hooks`)

| File | Purpose |
|------|---------|
| `useBalanceTracking.ts` | Balance tracking hook |

### Constants (`/constants`)

| File | Purpose |
|------|---------|
| `schemas.ts` | Zod validation schemas |

### Utilities (`/lib`)

| File | Purpose |
|------|---------|
| `utils.ts` | Currency formatting, helpers |

---

## Shared Layer (`/src/lib`)

| File | Purpose |
|------|---------|
| `db.ts` | Prisma client singleton |

---

## Static Assets (`/public`)

| File | Purpose |
|------|---------|
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker |
| `offline.html` | Offline fallback page |

---

## Test Layer (`/tests`)

```
tests/
├── screenshots/              # Test screenshots
├── app.spec.ts               # App-level tests
├── bulk-delete.spec.ts       # Bulk deletion tests
├── core-features.spec.ts     # Core feature tests
├── credit-card-deletion.spec.ts # CC deletion tests
├── check-accounts.cjs        # Account validation script
├── check-db.cjs              # DB validation script
└── check-transactions.cjs    # Transaction validation script
```

---

## Key Technologies

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (Strict) |
| Database ORM | Prisma 6 |
| Styling | Tailwind CSS 4 |
| Mobile Wrapper | Capacitor (PWA) |
| AI | Google Gemini 1.5 Flash |
| Validation | Zod |
| Forms | React Hook Form |
| UI Components | Vaul (drawer), Fuse.js (search) |
| Testing | Playwright |

---

## Architecture Principles

### FBA-SOLID-SSOT

- **Feature-Based Architecture (FBA)**: All finance code in `src/features/finance/`
- **SOLID**: Single responsibility, open/closed principles
- **Single Source of Truth (SSOT)**: Full audit trails, soft deletes, no hard deletes

### Audit Trail Requirements

Every model includes:

```prisma
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
createdById  String
updatedById  String?
deletedAt    DateTime?  // Soft deletes
```

---

## Build Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Run development server
npm run dev

# Run tests
npx playwright test

# Build for production
npm run build
```

---

## Environment Variables

```env
DATABASE_URL="postgresql://..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

---

## Current Build Status

### Phase 1: Core Architecture ✅

- [x] Prisma schema with audit trails
- [x] FinanceService atomic transfers
- [x] Zod validation schemas

### Phase 2: Net Liquidity Dashboard ✅

- [x] NetLiquidityCard component
- [x] AccountGrid with horizontal scrolling
- [x] Loading states with skeletons

### Phase 3: Friction Reduction 🚧

- [x] QuickLogDrawer with vaul
- [x] Numpad trigger (`inputmode="decimal"`)
- [ ] CategorySearch with fuse.js (pending)

### Phase 4: AI & Tax Logic 🚧

- [ ] Gemini receipt parsing Server Action
- [ ] TaxProjectionCard component
- [ ] Linear regression logic

---

## Quick Navigation

### By Feature

- **Dashboard**: `src/features/finance/components/Dashboard.tsx`
- **Net Liquidity**: `src/features/finance/components/NetLiquidityHero.tsx`
- **Quick Log**: `src/features/finance/components/QuickLogDrawer.tsx`
- **Accounts**: `src/features/finance/components/AccountManager.tsx`
- **Transactions**: `src/features/finance/components/TransactionHistory.tsx`

### By Data Layer

- **Schema**: `prisma/schema/finance.prisma`
- **Queries**: `src/features/finance/server/queries.ts`
- **Actions**: `src/features/finance/server/actions.ts`
- **Service**: `src/features/finance/services/FinanceService.ts`

### By Configuration

- **Main Config**: `QWEN.md`
- **PRD**: `Master PRD_Vibe-Finance.md`
- **Build Plan**: `Vibe-Finance Build Plan.md`

---

*Index generated by Qwen Code*
