import Dashboard from "@/features/finance/components/Dashboard";

// Mock user ID - replace with actual auth in production
const CURRENT_USER_ID = "user_123";

// Force dynamic rendering (no static generation)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Disable edge caching
export const headers = () => ({
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
});

interface HomePageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

/**
 * Validate and parse month parameter
 * - Accepts numeric strings only (e.g., "3" or "03")
 * - Valid range: 1-12
 * - Returns undefined for invalid/missing values
 */
function parseMonth(monthStr: string | undefined): number | undefined {
  if (!monthStr) return undefined;
  
  // Must be a numeric string only
  if (!/^\d+$/.test(monthStr)) return undefined;
  
  const month = parseInt(monthStr, 10);
  
  // Valid range check
  if (month < 1 || month > 12) return undefined;
  
  return month;
}

/**
 * Validate and parse year parameter
 * - Accepts numeric strings only (e.g., "2026")
 * - Valid range: 2000-2100
 * - Returns undefined for invalid/missing values
 */
function parseYear(yearStr: string | undefined): number | undefined {
  if (!yearStr) return undefined;
  
  // Must be a numeric string only
  if (!/^\d+$/.test(yearStr)) return undefined;
  
  const year = parseInt(yearStr, 10);
  
  // Valid range check
  if (year < 2000 || year > 2100) return undefined;
  
  return year;
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  
  // Safe parsing: invalid params become undefined (no NaN, no crashes)
  const month = parseMonth(params.month);
  const year = parseYear(params.year);
  
  // If either is invalid, treat period as undefined (current month behavior)
  const validPeriod = (month !== undefined && year !== undefined) 
    ? { month, year } 
    : { month: undefined, year: undefined };

  return <Dashboard userId={CURRENT_USER_ID} month={validPeriod.month} year={validPeriod.year} />;
}
