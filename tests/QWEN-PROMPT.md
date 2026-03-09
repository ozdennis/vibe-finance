You are editing the repo at: `F:\Work\Gemini Finance`

Mode:
- DIFF-ONLY execution.
- Make minimal targeted edits.
- Do not refactor unrelated code.
- Do not touch files outside the required list.
- English only.

Required files (and only these unless absolutely necessary for compile):
1. `src/features/finance/components/QuickLogDrawer.tsx`
2. `src/features/finance/components/InvestmentShelf.tsx`
3. `src/features/finance/server/deposit-actions.ts`

Pre-check (mandatory):
- Read current contents of all 3 files and confirm whether each required behavior is already present.
- If already present, do not modify that part.

Required fixes:

A) `QuickLogDrawer.tsx`
- Add early TIME_DEPOSIT withdrawal detection using:
  - transfer type
  - source account INVESTMENT + `productType === "TIME_DEPOSIT"`
  - transfer date < maturity date (`depositStartDate + depositTermMonths`)
- Add optional `penaltyAmount` form field.
- Show warning panel only when early withdrawal is detected.
- Show computed net transfer (`amount - penalty`) in panel.
- Route submit:
  - early TIME_DEPOSIT transfer -> `transferFromDepositWithPenalty`
  - all other flows -> existing `createTransaction`
- Preserve existing behavior for FLEXI and non-time-deposit accounts.

B) `InvestmentShelf.tsx`
- Extend account typing with:
  - `yieldMode`, `depositTermMonths`, `maturityDate`,
  - `projectedInterestGross`, `projectedInterestTax`, `projectedInterestNet`, `isMatured`
- For TIME_DEPOSIT cards show:
  - term
  - maturity date
  - projected net maturity value
  - tax subtext when projected tax > 0
  - label semantics:
    - before maturity: `Projected @ Maturity`
    - maturity month estimated: `Maturity Interest (Est)`
- Keep FLEXI display unchanged.

C) `deposit-actions.ts`
- In target account update for early withdrawal transfer:
  - if target is `CREDIT_CARD`: `{ decrement: netTransfer }`
  - else: `{ increment: netTransfer }`
- Keep current validation/metadata logic unchanged.

Validation (mandatory):
1. `npm run build`
2. `npm run e2e:test`

Output format (strict):
1) `VERDICT TABLE` with PASS/FAIL and file:line evidence for:
   - QuickLogDrawer early withdrawal flow
   - InvestmentShelf TIME_DEPOSIT rendering
   - deposit-actions credit-card semantics
   - build
   - e2e
2) `CHANGED FILES` (exact list)
3) `PATCH SUMMARY` with bullet points per file, each bullet mapped to a requirement above
4) `BLOCKERS` (must be explicit `None` if none)

Hard constraints:
- No placeholder code.
- No narrative outside the required sections.
- No claiming PASS without code evidence from current files.
