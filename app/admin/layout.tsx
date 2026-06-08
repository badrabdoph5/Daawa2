import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/DashboardShell";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "لوحة الإدارة",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!(await verifyAdminSessionCookie(session))) {
    return <div className="admin-dark-shell">{children}</div>;
  }

  return (
    <div className="admin-dark-shell">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
