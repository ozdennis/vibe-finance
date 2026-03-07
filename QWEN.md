# Vibe Finance OS - Project Context

## Project Overview

**Vibe Finance** is a mobile-first personal wealth operating system designed to solve "balance delusion" by providing real-time net liquidity tracking. The application aggregates cash, e-wallets, and credit card debt to show users their "Real Money" (Cash - CC Debt).

### Core Objectives
- **Net Liquidity Engine**: Real-time aggregation where `Net = Σ(Assets) - Σ(Liabilities)`
- **Zero-Friction Input**: Mobile-optimized transaction logging under 5 seconds
- **AI Receipt Vision**: Gemini 1.5 Flash integration for receipt parsing
- **Tax Projection**: Year-end tax estimation based on income trends

### Target User
- **The Debt-Blind High Spender**: Needs immediate view of "Real Money" to avoid overspending
- **The Friction-Averse Logger**: Needs automatic keyboard switching (Numpad vs Text)

## Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router) |
| **Database ORM** | Prisma 6 |
| **Styling** | Tailwind CSS 4 |
| **Mobile Wrapper** | Capacitor (PWA) |
| **AI** | Google Gemini 1.5 Flash |
| **Validation** | Zod |
| **Form Handling** | React Hook Form |
| **UI Components** | Vaul (bottom drawer), Fuse.js (fuzzy search) |
| **Localization** | `id-ID` (Indonesian Rupiah), `en-US` (language) |

## Architecture: FBA-SOLID-SSOT

**Feature-Based Architecture (FBA)** with strict Single Source of Truth (SSOT) principles:

```
src/
└── features/
    └── finance/
        ├── components/          # UI Blocks (NetLiquidityCard, QuickLogDrawer, AccountGrid)
        ├── constants/           # Zod schemas & currency configs
        ├── hooks/               # Custom hooks (useBalanceTracking)
        ├── server/
        │   ├── actions.ts       # Next.js Server Actions (mutations)
        │   ├── queries.ts       # Data fetching (Net Liquidity calculation)
        │   └── ai-actions.ts    # Gemini receipt parsing
        └── services/
            └── FinanceService.ts # Business logic (atomic transfers)
```

## Database Schema (Prisma)

### Core Models

**Account**
```prisma
model Account {
  id           String      @id @default(cuid())
  name         String
  type         AccountType (CASH | E_WALLET | CREDIT_CARD | INVESTMENT)
  balance      Decimal     @default(0) @db.Decimal(19, 4)
  creditLimit  Decimal?    @db.Decimal(19, 4)
  currency     String      @default("IDR")
  
  // Audit Trail (FBA-SOLID-SSOT Mandatory)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  createdById  String
  updatedById  String?
  deletedAt    DateTime?   // Soft deletes for SSOT
  
  @@index([createdById])
  @@index([type])
}
```

**Transaction**
```prisma
model Transaction {
  id              String          @id @default(cuid())
  amount          Decimal         @db.Decimal(19, 4)
  type            TransactionType (INCOME | EXPENSE | TRANSFER)
  description     String?
  categoryId      String?
  
  // Transfer Logic
  fromAccountId   String?
  toAccountId     String?
  
  // Tax & AI Metadata
  isTaxDeductible Boolean         @default(false)
  taxYear         Int?
  metadata        Json?           // Gemini Vision payload
  
  // Audit Trail (FBA-SOLID-SSOT Mandatory)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  createdById     String
  updatedById     String?
  
  @@index([createdById])
  @@index([fromAccountId])
  @@index([toAccountId])
}
```

### Key Design Decisions

| Decision | Implementation | Why |
| :--- | :--- | :--- |
| **Full Audit Trail** | `createdAt`, `updatedAt`, `createdById`, `updatedById` | Compliance & debugging |
| **Soft Deletes** | `deletedAt` field | SSOT - never lose data |
| **Multi-tenant** | `createdById` on all models | Row-level security |
| **Decimal Precision** | `@db.Decimal(19, 4)` | Financial accuracy |
| **Indexes** | On `createdById`, `type`, `fromAccountId`, `toAccountId` | 100ms query response |

## Key Features

### 1. Net Liquidity Hero
- Displays "Real Money" = (Cash + E-Wallets) - Credit Card Debt
- Color-coded: Emerald (#10b981) for positive, Crimson (#ef4444) for negative
- Server Component for zero-JS initial load

### 2. Quick Log Drawer
- Bottom sheet using `vaul` library
- Auto-focus on amount field with `inputmode="decimal"` (forces numpad)
- Fuzzy category search via `fuse.js`

### 3. Atomic Transfers
- Database transaction ensures source decrement + target increment are atomic
- Maintains SSOT for balance tracking

### 4. AI Receipt Vision
- Server Action accepts base64 image
- Gemini 1.5 Flash returns JSON: `{ amount, merchant, category, date }`
- Auto-populates Quick Log fields

### 5. Tax Projection
- Linear regression based on monthly income trends
- Formula: `(Current_Income * 12_Month_Projection) - Deductions`

## Building and Running

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Cloud credentials (for Gemini API)

### Setup Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Run development server
npm run dev
```

### Environment Variables
```env
DATABASE_URL="postgresql://..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

## Development Conventions

### Coding Style
- **TypeScript**: Strict mode enabled
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File Structure**: Co-locate related components, services, and types within feature folders

### FBA-SOLID-SSOT Principles

| Principle | Implementation |
| :--- | :--- |
| **Feature-Based** | All finance code in `src/features/finance/` |
| **Single Responsibility** | Each service/component does one thing |
| **Open/Closed** | Extend via new hooks, don't modify core |
| **Single Source of Truth** | Soft deletes, audit trails, no hard deletes |

### Audit Trail Requirements (Mandatory)
Every model MUST have:
```prisma
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
createdById  String
updatedById  String?
deletedAt    DateTime?  // For SSOT
```

### SELF-ANNEALING LOOP (CRITICAL - NEVER SKIP)

**Every UI feature MUST follow this loop:**

```
1. BUILD → Write the component/code
2. SCREENSHOT → Capture what you built (use browser screenshot)
3. TEST → Run `npm run dev` and open in browser
4. SCREENSHOT → Capture the live result
5. VERIFY → Compare: Does it match expectations?
   │
   ├─ NO → FIX → Go to step 3
   └─ YES → Mark complete
```

**Violations = Task NOT complete. Never assume. Always verify.**

**Common failure patterns to reject:**
- Buttons with low contrast text (e.g., `text-slate-400` on dark bg)
- Elements that only appear on hover
- Forms without visible submit buttons
- Icons without labels or tooltips
- Modals that don't close properly
- Empty states without action prompts

**Before marking any UI task complete:**
1. Open browser at localhost:3000
2. Navigate to the page
3. Take screenshot
4. Verify ALL interactive elements are VISIBLE without hovering
5. Click every button to confirm it works
6. Only then mark complete

### Testing Practices
- Server Actions: Test atomic transactions with rollback scenarios
- Components: Test mobile responsiveness and numpad triggering
- Queries: Verify net liquidity calculation edge cases
- **UI: Visual verification with screenshots - NEVER assume**

### Security & RBAC
- All queries/mutations filter by `createdById`
- Database-level constraints prevent negative CC balances
- Owner-only data access (single-tenant design)

### PWA Configuration
- `manifest.json` configured for "Add to Home Screen"
- Theme color: `#10b981` (Emerald)
- Background: `#0f172a` (Slate 950)

## Design System: Industrial Utilitarian (Dark Mode)

| Element | Color/Style |
| :--- | :--- |
| **Background** | Slate 950 (`#0f172a`) |
| **Cards** | Slate 900 with Slate 800 borders |
| **Cash/Assets** | Neon Emerald (`#10b981`) |
| **Debt/Liabilities** | Soft Crimson (`#ef4444`) |
| **Typography** | Uppercase labels, bold numerics |
| **Corners** | Rounded 2xl/3xl for mobile-friendly feel |

## Current Build Status

### Phase 1: Core Architecture ✅
- [x] Prisma schema defined
- [x] FinanceService.ts atomic transfers
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

## Key Files Reference

| File | Purpose |
| :--- | :--- |
| `prisma/schema/finance.prisma` | Database schema with full audit trail |
| `src/features/finance/services/FinanceService.ts` | Atomic transfer logic |
| `src/features/finance/server/actions.ts` | Transaction mutations |
| `src/features/finance/server/ai-actions.ts` | Gemini receipt parsing |
| `src/features/finance/server/queries.ts` | Net liquidity & trend calculations |
| `src/features/finance/components/Dashboard.tsx` | Main dashboard page |
| `src/features/finance/components/NetLiquidityHero.tsx` | "Real Money" display |
| `src/features/finance/components/QuickLogDrawer.tsx` | Mobile transaction input |
| `src/features/finance/components/AccountGrid.tsx` | Horizontal account scroll |
| `src/features/finance/components/CategorySearch.tsx` | Fuse.js fuzzy search |
| `src/features/finance/components/TaxMeter.tsx` | Tax projection component |
| `src/features/finance/constants/schemas.ts` | Zod validation schemas |
| `src/features/finance/lib/utils.ts` | Currency formatting, helpers |
| `public/manifest.json` | PWA configuration |
| `public/sw.js` | Service worker |

## Success Metrics

- **Logging Completion**: Under 5 seconds
- **Debt Surprise Rate**: 0% (users always see real-time CC debt)
- **Mobile UX**: No keyboard switching friction
