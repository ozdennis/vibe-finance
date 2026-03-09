# Master PRD: Vibe-Finance (Personal Wealth OS)

**Date:** 2026-03-09
**Status:** Approved (v1.2 Expansion)
**Target Audience:** High-Turnover Individual Users & Investors

## 1. Executive Summary
- **Objective**: Expand the Net Liquidity tracker to handle human error (discrepancies/hidden fees), temporal filtering (Calendar views), and illiquid asset tracking (Investments).

## 2. Core Architectural Upgrades (MoSCoW)

### 2.1 [Must Have] The Reconciliation Engine (True-Up)
- **Problem**: Invisible bank fees and forgotten transactions cause balance drift.
- **Solution**: A "Sync" function where the user inputs the *actual* bank balance. The system automatically creates a corrective transaction for the exact difference.
- **Audit Requirement**: These system-generated transactions MUST be tagged with a specific `categoryId` (e.g., "System Reconciliation") so the user can review how much money was "lost" to forgetfulness or bank fees at the end of the year.

### 2.2 [Must Have] Global Temporal Context (Calendar)
- **Problem**: Users cannot see past or future trends.
- **Solution**: A sticky header with a Month/Year toggle.
- **Constraint**: Must use Next.js `useSearchParams()` to sync with the URL. 

### 2.3 [Must Have] Investment & Net Worth Tiering
- **Problem**: Mixing stocks with cash creates a false sense of spending power.
- **Solution**: Create a dual-layer metric:
  - `Net Liquidity` = (Cash + Wallet) - CC Debt. (Money you can spend today).
  - `Total Net Worth` = Net Liquidity + Investments. (Your actual wealth).

## 3. Database Schema Adjustments (Prisma)
- **Account Model**: Utilize the existing `INVESTMENT` enum.
- **Transaction Model**: Add an `isReconciliation` boolean flag to differentiate user-logged expenses from system-generated true-ups.