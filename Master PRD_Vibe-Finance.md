# Master PRD: Vibe-Finance (Personal Wealth Operating System)

**Date:** 2023-10-27
**Status:** Approved
**Target Audience:** High-Turnover Individual Users

## 0. Version History & Changelog
| Date | Version | Author | Changes/Notes |
|---|---|---|---|
| 2023-10-27 | 1.0 | Elite PM | Initial Discovery & FBA Mapping |
| 2023-10-27 | 1.1 | Elite PM | Mobile Wrapper & Input Friction Optimization |

## 1. Executive Summary
- **Objective**: Solve "Balance Delusion" and high-friction logging by creating a mobile-first "Net Liquidity" engine.
- **Success Metrics**: 0% "Debt Surprise" rate; Logging completion under 5 seconds.

## 1.1 User Personas
- **The Debt-Blind High Spender**: Needs an immediate view of 'Real Money' (Cash - CC Debt) to avoid overspending.
- **The Friction-Averse Logger**: Needs a system that handles keyboard switching (Numpad vs Text) automatically.

## 2. Technical Constraints
- **Stack**: Next.js 16, Prisma 6, Tailwind 4, Capacitor (for Wrapper).
- **Localization**: Currency `id-ID`, Language `en-US` (as per user interaction).
- **Architecture**: FBA (Feature-Based Architecture).

## 3. Feature Breakdown (MoSCoW)

### 3.1 [Must Have] Net Liquidity Engine
- **Logic**: Real-time aggregation where `Net = Σ(Assets) - Σ(Liabilities)`.
- **Atomic Transfers**: Movement between BCA and E-Wallets must be a single transaction to maintain SSOT.

### 3.2 [Must Have] Zero-Friction Input (Mobile-First)
- **UI Logic**: Amount fields use `inputmode="decimal"` to force numpad. 
- **Auto-Focus**: Searchable dropdown for categories uses `fuse.js` for typo-tolerance.

### 3.3 [Should Have] AI Receipt Vision
- **Service**: Server Action using Gemini-1.5-Flash to parse image `base64` into JSON (Amount, Merchant, Date).

### 3.4 [Should Have] Tax Projection
- **Formula**: `Yearly_Tax = (Current_Income * 12_Month_Projection) - Deductions`.

## 4. Technical Schema (Prisma 6)

| Model | Fields | Note |
| :--- | :--- | :--- |
| **Account** | `id, name, type (CASH/CC), balance, creditLimit` | Fundamental asset/debt container. |
| **Transaction** | `id, amount, type (INC/EXP/TRF), fromId, toId` | Ledger of all movements. |
| **AuditLog** | `id, action, timestamp, payload` | Tracks manual balance overrides. |

## 5. Security & RBAC
- **Owner-Only**: All data is restricted to the authenticated user ID (`createdById`).
- **Data Integrity**: Database-level constraints prevent negative balances on Credit Cards (enforcing debt visibility).