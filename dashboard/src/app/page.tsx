import { redirect } from "next/navigation";

import { TodayHome } from "@/components/health/today-home";
import { getDashboardUserId } from "@/lib/auth-user";
import { loadTodaySummary } from "@/lib/today";

export const dynamic = "force-dynamic";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const userId = await getDashboardUserId();
  if (!userId) redirect("/sign-in");

  const summary = await loadTodaySummary(userId);
  return <TodayHome summary={summary} />;
}
