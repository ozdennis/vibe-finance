[Prompt for Qwen - Frontend]

You are the frontend implementation agent for this repo:
F:\Work\Gemini Finance

Read these files first:
- F:\Work\Gemini Finance\tests\Design Brief (Dashboard Expansion).md
- F:\Work\Gemini Finance\tests\Master PRD.md
- F:\Work\Gemini Finance\tests\Task List (Stage 3 Scoping).md

Backend is already finalized; do not edit Prisma or backend action/query logic.

Goal:
Implement Stage 3 frontend only (mobile-first) using existing visual language.

Hard constraints:
1. Frontend only: app routes, components, client interaction, and Playwright tests.
2. Do not modify Prisma schema or backend business logic.
3. Preserve current design system style and spacing conventions.
4. Month filter scope:
   - Applies to analytics panels (trend/history/tax/investment MTD)
   - Does NOT change real-time hero balances.
5. Keep existing route structure unless explicitly needed.

Required frontend work:
1. Global temporal header:
   - Add month/year navigator with left/right chevrons.
   - Sync selection to URL search params: ?month=MM&year=YYYY.
   - Wire page.tsx -> Dashboard props from searchParams.
2. Dual hero metrics:
   - Update hero to show:
     - Primary: Net Liquidity (large)
     - Secondary: Total Net Worth (smaller, subtle)
   - Total Net Worth = Net Liquidity + Investments.
3. Investment shelf:
   - Add a dedicated horizontal section for INVESTMENT accounts only.
   - Show account name, current balance, and MTD growth from backend.
   - Remove investments from main AccountGrid.
4. Sync Balance action in Settings:
   - In settings account rows, add prominent amber “Sync Balance” action.
   - Open modal with fields:
     - Actual balance (required)
     - Effective date (default today)
     - Reason (optional)
   - Call syncAccountBalance action.
   - Handle success/error states and refresh UI.
5. URL period wiring:
   - Pass selected month/year context to analytics components/queries.
   - Keep hero values real-time.
6. E2E tests (Playwright):
   - Add/extend tests for:
     - Month picker URL sync
     - Dual hero render
     - Investment shelf visibility and values
     - Sync Balance modal flow from settings

Definition of done:
1. New UI works on mobile + desktop.
2. No regression to quick log, transaction list, settings CRUD.
3. All added interactions are accessible (labels/focus/keyboard escape for modal).
4. Playwright scenarios for new features pass locally.

Run and report:
1. npm run build
2. npx playwright test (or targeted spec files)
3. Include screenshot evidence paths for new scenarios

Output format (strict):
1. Summary (5-10 lines)
2. Changed files
3. UI behaviors implemented
4. Test results
5. Remaining gaps/follow-ups
