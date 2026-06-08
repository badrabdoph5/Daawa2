"use client";

import { AlertTriangle } from "lucide-react";
import { ErrorRecoveryActions } from "@/components/ErrorRecoveryActions";

export default function AdminErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="admin-error-page">
      <section className="admin-error-card">
        <AlertTriangle size={34} />
        <span className="eyebrow">Admin Safety</span>
        <h1>حصل خطأ داخل لوحة الإدارة</h1>
        <p>الصفحة لم تتوقف بصمت. جرّب إعادة التحميل، ولو المشكلة مستمرة راجع اتصال قاعدة البيانات أو متغيرات Railway.</p>
        {error.digest ? <code>{error.digest}</code> : null}
        <ErrorRecoveryActions error={error} context="admin" reset={reset} />
      </section>
    </main>
  );
}
