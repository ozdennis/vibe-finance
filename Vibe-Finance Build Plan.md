# Scoping: Vibe-Finance Build Plan

## Phase 1: Core Architecture (Backend)
- [ ] Create `prisma/schema/finance.prisma` with `Account` and `Transaction` models.
- [ ] Implement `FinanceService.ts` for atomic transfers (BCA -> Wallet).
- [ ] Define Zod schemas for `TransactionCreate` with strict amount validation.

## Phase 2: The "Net Liquidity" Dashboard (Frontend)
- [ ] Build `NetLiquidityCard.tsx` using Server Components for zero-JS initial load.
- [ ] Create `AccountGrid.tsx` with horizontal mobile scrolling and skeleton states.
- [ ] Implement `loading.tsx` for the main dashboard segment.

## Phase 3: Friction Reduction (Mobile UX)
- [ ] Build `QuickLogDrawer.tsx` using `vaul` for bottom-sheet experience.
- [ ] Set `inputmode="decimal"` on all amount fields to trigger mobile numpad.
- [ ] Implement `CategorySearch.tsx` using `fuse.js` for instant feedback.

## Phase 4: AI & Tax Logic (Integration)
- [ ] Configure `google-generative-ai` SDK in a Next.js Server Action.
- [ ] Create `TaxProjectionCard.tsx` with simple linear regression based on monthly trends.