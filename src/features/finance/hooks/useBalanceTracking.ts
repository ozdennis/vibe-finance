// src/features/finance/hooks/useBalanceTracking.ts
"use client";

import useSWR, { mutate } from "swr";
import { getNetLiquidity, getCategories, getRecentTransactions } from "../server/queries";

/**
 * Hook for tracking balance and net liquidity
 * Auto-refreshes after mutations
 */
export function useBalanceTracking(userId: string) {
  const { data: liquidityData, error: liquidityError, isLoading: liquidityLoading } = useSWR(
    userId ? `net-liquidity-${userId}` : null,
    () => getNetLiquidity(userId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const { data: categories, error: categoriesError, isLoading: categoriesLoading } = useSWR(
    userId ? `categories-${userId}` : null,
    () => getCategories(userId),
    {
      revalidateOnFocus: false,
    }
  );

  const { data: transactions, error: transactionsError, isLoading: transactionsLoading } = useSWR(
    userId ? `transactions-${userId}` : null,
    () => getRecentTransactions(userId, 10),
    {
      revalidateOnFocus: false,
    }
  );

  const isLoading = liquidityLoading || categoriesLoading || transactionsLoading;
  const error = liquidityError || categoriesError || transactionsError;

  return {
    accounts: liquidityData?.accounts || [],
    netLiquidity: liquidityData?.netLiquidity || 0,
    cashTotal: liquidityData?.cashTotal || 0,
    debtTotal: liquidityData?.debtTotal || 0,
    investmentsTotal: liquidityData?.investmentsTotal || 0,
    categories: categories || [],
    transactions: transactions || [],
    isLoading,
    error,
    // Manual revalidation function
    refresh: () => {
      mutate(`net-liquidity-${userId}`);
      mutate(`categories-${userId}`);
      mutate(`transactions-${userId}`);
    },
  };
}

/**
 * Hook for fetching accounts only
 */
export function useAccounts(userId: string) {
  const { data, error, isLoading } = useSWR(
    userId ? `accounts-${userId}` : null,
    () => getNetLiquidity(userId).then(d => d.accounts),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    accounts: data || [],
    isLoading,
    error,
    refresh: () => mutate(`accounts-${userId}`),
  };
}

/**
 * Hook for fetching transactions only
 */
export function useTransactions(userId: string, limit = 20) {
  const { data, error, isLoading } = useSWR(
    userId ? `transactions-${userId}-${limit}` : null,
    () => getRecentTransactions(userId, limit),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    transactions: data || [],
    isLoading,
    error,
    refresh: () => mutate(`transactions-${userId}-${limit}`),
  };
}

/**
 * Hook for fetching categories only
 */
export function useCategories(userId: string) {
  const { data, error, isLoading } = useSWR(
    userId ? `categories-${userId}` : null,
    () => getCategories(userId),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    categories: data || [],
    isLoading,
    error,
    refresh: () => mutate(`categories-${userId}`),
  };
}
