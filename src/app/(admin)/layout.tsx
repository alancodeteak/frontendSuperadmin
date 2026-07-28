import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { AdminShell } from "@/components/layout/admin-shell";
import { AuthGate } from "@/components/providers/auth-gate";

export default async function DashboardGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AuthGate>
      <AdminShell defaultOpen={defaultOpen}>{children}</AdminShell>
    </AuthGate>
  );
}
