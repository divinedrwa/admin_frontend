"use client";

import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/AppShell";

// Standard admin chrome (same default header as every other page) with a
// per-section title for the routes that live in this group.
const SECTION_TITLES: [prefix: string, title: string][] = [
  ["/expenses-summary", "Expense Summary"],
  ["/expense-categories", "Expense Categories"],
  ["/expenses", "Expenses"],
  ["/notifications", "Notifications"],
  ["/special-projects", "Special Projects"],
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title =
    SECTION_TITLES.find(([prefix]) => pathname?.startsWith(prefix))?.[1] ?? "Dashboard";

  return (
    <AppShell title={title}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}
