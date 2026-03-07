src/
└── features/
    └── finance/
        ├── components/          # UI Blocks (NetLiquidityCard, QuickLog)
        ├── constants/           # Zod Schemas & Currency Configs
        ├── hooks/               # useBalanceTracking
        ├── server/
        │   ├── actions.ts       # Next.js Server Actions (Mutation)
        │   └── queries.ts       # Data Fetching (Net Liquidity Calculation)
        └── services/
            └── FinanceService.ts # Business Logic (Atomic Transfers)