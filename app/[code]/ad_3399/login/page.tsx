import type { Metadata } from "next";
import { LoginPanel } from "@/components/LoginPanel";

export const metadata: Metadata = {
  title: "دخول لوحة العميل",
};

export default async function CustomerLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);

  return (
    <LoginPanel
      action="/api/auth/client/login"
      title="دخول لوحة الدعوة"
      description="تابع الحضور، عدل بيانات الدعوة، واستبدل الصور من مكان واحد."
      error={query.error}
      hiddenFields={{ code }}
    />
  );
}
