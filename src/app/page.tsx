import Dashboard from "@/features/finance/components/Dashboard";

// Mock user ID - replace with actual auth in production
const CURRENT_USER_ID = "user_123";

// Force dynamic rendering (no static generation)
export const dynamic = "force-dynamic";

export default function Home() {
  return <Dashboard userId={CURRENT_USER_ID} />;
}
