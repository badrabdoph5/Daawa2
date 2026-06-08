import Link from "next/link";
import { CheckCircle2, Github, History, RefreshCw, Settings, XCircle } from "lucide-react";
import { getGitHubSyncReadiness, getSyncHistory } from "@/lib/github-sync";
import { getSyncQueueStatus } from "@/lib/github-sync-queue";

export const dynamic = "force-dynamic";

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function SyncSettingsPage() {
  const [readiness, queue, { logs, total }] = await Promise.all([
    Promise.resolve(getGitHubSyncReadiness()),
    Promise.resolve(getSyncQueueStatus()),
    getSyncHistory({ limit: 10 }),
  ]);

  const completedLogs = logs.filter((l) => l.status === "completed");
  const failedLogs = logs.filter((l) => l.status === "failed");
  const successRate = total > 0 ? Math.round((completedLogs.length / Math.min(logs.length, total)) * 100) : 0;
  const avgDuration =
    completedLogs.length > 0
      ? Math.round(completedLogs.reduce((sum, l) => sum + (l.duration ?? 0), 0) / completedLogs.length)
      : null;

  const envVars = [
    { key: "GITHUB_SYNC_TOKEN", label: "GitHub Token", set: Boolean(process.env.GITHUB_SYNC_TOKEN || process.env.BACKUP_GITHUB_TOKEN) },
    { key: "GITHUB_SYNC_REPO", label: "Repository", set: Boolean(process.env.GITHUB_SYNC_REPO || process.env.BACKUP_GITHUB_REPO) },
    { key: "GITHUB_SYNC_BRANCH", label: "Branch", set: Boolean(process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH) },
    { key: "GITHUB_SYNC_ENABLED", label: "Sync Enabled", set: process.env.GITHUB_SYNC_ENABLED !== "false" },
  ];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Sync Settings</span>
          <h1>إعدادات المزامنة</h1>
          <p>حالة إعداد مزامنة GitHub وإحصائيات الأداء.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/admin/sync-history" className="btn btn-soft btn-glass">
            <History size={16} />
            سجل المزامنة
          </Link>
          <form action="/api/admin/sync-status" method="post">
            <button className="btn btn-gold btn-glow" type="submit">
              <RefreshCw size={16} />
              مزامنة الآن
            </button>
          </form>
        </div>
      </div>

      {/* Readiness status */}
      <section className="panel" style={{ marginBottom: "16px" }}>
        <div className="admin-card-head">
          <Github size={22} />
          <div>
            <span className="eyebrow">Connection Status</span>
            <h2>حالة الاتصال</h2>
          </div>
        </div>
        <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {readiness.configured ? (
              <CheckCircle2 size={20} style={{ color: "#bfe8d6" }} />
            ) : (
              <XCircle size={20} style={{ color: "#ffc0bd" }} />
            )}
            <span className={`admin-health-pill ${readiness.configured ? "good" : "danger"}`}>
              {readiness.label}
            </span>
            <small style={{ color: "rgba(245,234,214,0.6)" }}>{readiness.detail}</small>
          </div>

          <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
            {envVars.map((env) => (
              <div key={env.key} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {env.set ? (
                  <CheckCircle2 size={15} style={{ color: "#bfe8d6", flexShrink: 0 }} />
                ) : (
                  <XCircle size={15} style={{ color: "#ffc0bd", flexShrink: 0 }} />
                )}
                <code style={{ fontSize: "0.82rem", color: "rgba(245,234,214,0.7)" }}>{env.key}</code>
                <span style={{ fontSize: "0.82rem", color: "rgba(245,234,214,0.5)" }}>{env.label}</span>
                <span className={`admin-health-pill ${env.set ? "good" : "danger"}`} style={{ fontSize: "0.75rem", minHeight: "24px", padding: "3px 8px" }}>
                  {env.set ? "مضبوط" : "ناقص"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="panel" style={{ marginBottom: "16px" }}>
        <div className="admin-card-head">
          <Settings size={22} />
          <div>
            <span className="eyebrow">Statistics</span>
            <h2>إحصائيات المزامنة</h2>
          </div>
        </div>
        <div className="backup-status-grid" style={{ marginTop: "16px" }}>
          <article className="panel backup-status-card">
            <Github size={24} />
            <span>إجمالي العمليات</span>
            <strong>{total}</strong>
          </article>
          <article className="panel backup-status-card">
            <CheckCircle2 size={24} />
            <span>معدل النجاح (آخر {logs.length})</span>
            <strong>{successRate}%</strong>
          </article>
          <article className="panel backup-status-card">
            <RefreshCw size={24} />
            <span>متوسط المدة</span>
            <strong>{formatDuration(avgDuration)}</strong>
          </article>
          <article className="panel backup-status-card">
            <XCircle size={24} />
            <span>فشل (آخر {logs.length})</span>
            <strong>{failedLogs.length}</strong>
          </article>
        </div>
      </section>

      {/* Queue status */}
      <section className="panel" style={{ marginBottom: "16px" }}>
        <div className="admin-card-head">
          <History size={22} />
          <div>
            <span className="eyebrow">Queue</span>
            <h2>الطابور الحالي</h2>
          </div>
        </div>
        <div style={{ marginTop: "12px" }}>
          {queue.queueLength === 0 && !queue.isSyncing ? (
            <p style={{ color: "rgba(245,234,214,0.5)", margin: 0 }}>الطابور فارغ — لا توجد عمليات معلقة.</p>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              <p style={{ margin: 0, color: "rgba(245,234,214,0.7)" }}>
                {queue.isSyncing ? "جاري المزامنة الآن…" : `${queue.queueLength} عملية في الانتظار`}
              </p>
              {queue.items.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.85rem" }}>
                  <span className={`admin-health-pill ${item.status === "completed" ? "good" : item.status === "failed" ? "danger" : ""}`} style={{ fontSize: "0.75rem", minHeight: "22px", padding: "2px 8px" }}>
                    {item.status}
                  </span>
                  <span style={{ color: "rgba(245,234,214,0.7)" }}>{item.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Last 10 syncs */}
      <section className="panel">
        <div className="admin-card-head">
          <History size={22} />
          <div>
            <span className="eyebrow">Recent</span>
            <h2>آخر 10 عمليات مزامنة</h2>
          </div>
        </div>
        <div className="table-shell" style={{ marginTop: "16px" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الحالة</th>
                <th>السبب</th>
                <th>الملفات</th>
                <th>المدة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`status ${log.status === "completed" ? "success" : log.status === "failed" ? "danger" : ""}`}>
                        {log.status === "completed" ? "مكتمل" : log.status === "failed" ? "فشل" : log.status === "pending" ? "انتظار" : "جاري"}
                      </span>
                    </td>
                    <td>
                      <span title={log.reason} style={{ maxWidth: "300px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.reason}
                      </span>
                    </td>
                    <td>{log.filesCount ?? "—"}</td>
                    <td>{formatDuration(log.duration)}</td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">
                      <strong>لا توجد سجلات بعد</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <Link href="/admin/sync-history" className="btn btn-soft btn-glass">
            عرض السجل الكامل
          </Link>
        </div>
      </section>
    </>
  );
}
