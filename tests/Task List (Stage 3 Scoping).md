# Scoping: Dashboard V2 Build Plan

## Phase 1: The Reconciliation Engine (Backend)
- [ ] Create `ReconciliationService.ts` to calculate discrepancies.
- [ ] Implement atomic db transaction: Create an `EXPENSE` or `INCOME` log based on the math difference, flagged with `isReconciliation = true`.

## Phase 2: Temporal UI & URL State
- [ ] Build `MonthPicker.tsx` component.
- [ ] Update `DashboardOverview.tsx` to accept `searchParams` (month, year).
- [ ] Modify `getNetLiquidity` query to filter `Transaction` aggregations based on the selected date range.

## Phase 3: The Investment Split
- [ ] Create `InvestmentCard.tsx` separated from the liquid `AccountGrid`.
- [ ] Implement the `Total Net Worth` calculation on the server.