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

export default function Home() {
  return <Dashboard userId={CURRENT_USER_ID} />;
}
