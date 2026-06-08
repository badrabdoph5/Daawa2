import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Github, Loader2, XCircle } from "lucide-react";
import { getSyncHistory } from "@/lib/github-sync";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  reason?: string;
  page?: string;
};

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

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 size={16} style={{ color: "#bfe8d6" }} />;
  if (status === "processing") return <Loader2 size={16} style={{ color: "#f3cf73" }} />;
  if (status === "pending") return <Clock size={16} style={{ color: "#f3cf73" }} />;
  if (status === "failed") return <XCircle size={16} style={{ color: "#ffc0bd" }} />;
  return <AlertCircle size={16} />;
}

function statusLabel(status: string) {
  if (status === "completed") return "مكتمل";
  if (status === "processing") return "جاري";
  if (status === "pending") return "انتظار";
  if (status === "failed") return "فشل";
  return status;
}

const PAGE_SIZE = 20;

export default async function SyncHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = params.status || "all";
  const reason = params.reason || "";
  const page = Math.max(1, Number(params.page || "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const { logs, total } = await getSyncHistory({
    limit: PAGE_SIZE,
    offset,
    status,
    reason,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Partial<SearchParams>) {
    const q = new URLSearchParams();
    const merged = { status, reason, page: String(page), ...overrides };
    if (merged.status && merged.status !== "all") q.set("status", merged.status);
    if (merged.reason) q.set("reason", merged.reason);
    if (merged.page && merged.page !== "1") q.set("page", merged.page);
    return `/admin/sync-history${q.size ? `?${q.toString()}` : ""}`;
  }

  const statusFilters = [
    { value: "all", label: "الكل" },
    { value: "completed", label: "مكتمل" },
    { value: "pending", label: "انتظار" },
    { value: "processing", label: "جاري" },
    { value: "failed", label: "فشل" },
  ];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Sync History</span>
          <h1>سجل المزامنة</h1>
          <p>سجل كامل لجميع عمليات مزامنة GitHub مع الحالة والتفاصيل.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link href="/admin/sync-settings" className="btn btn-soft btn-glass">
            <Github size={16} />
            إعدادات المزامنة
          </Link>
          <form action="/api/admin/sync-status" method="post">
            <button className="btn btn-gold btn-glow" type="submit">
              مزامنة الآن
            </button>
          </form>
        </div>
      </div>

      {/* Filters */}
      <div className="sync-history-filters">
        <div className="sync-filter-group">
          {statusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildUrl({ status: filter.value, page: "1" })}
              className={`sync-filter-btn${status === filter.value ? " active" : ""}`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <form method="get" action="/admin/sync-history" className="sync-search-form">
          <input
            type="text"
            name="reason"
            defaultValue={reason}
            placeholder="بحث في السبب…"
            className="sync-search-input"
          />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="btn btn-soft btn-glass">بحث</button>
        </form>
      </div>

      {/* Stats summary */}
      <div className="sync-stats-row">
        <span>إجمالي العمليات: <strong>{total}</strong></span>
        <span>الصفحة {page} من {totalPages || 1}</span>
      </div>

      {/* Table */}
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>الحالة</th>
              <th>السبب</th>
              <th>الملفات</th>
              <th>المدة</th>
              <th>المحاولات</th>
              <th>Commit</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {logs.length ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <StatusIcon status={log.status} />
                      {statusLabel(log.status)}
                    </span>
                  </td>
                  <td>
                    <span title={log.reason} style={{ maxWidth: "280px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.reason}
                    </span>
                    {log.errorMessage && (
                      <small style={{ color: "#ffc0bd", display: "block", marginTop: "2px" }}>
                        {log.errorMessage.slice(0, 120)}
                      </small>
                    )}
                  </td>
                  <td>{log.filesCount ?? "—"}</td>
                  <td>{formatDuration(log.duration)}</td>
                  <td>{log.retryCount}</td>
                  <td>
                    {log.commitUrl ? (
                      <a
                        href={log.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-soft btn-icon"
                        title={log.commitSha?.slice(0, 7)}
                      >
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    {log.status === "failed" && (
                      <form action="/api/admin/sync/retry" method="post">
                        <input type="hidden" name="logId" value={log.id} />
                        <input type="hidden" name="reason" value={log.reason} />
                        <button className="btn btn-soft btn-glass" type="submit" style={{ fontSize: "0.8rem" }}>
                          إعادة
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty-state">
                    <strong>لا توجد سجلات مزامنة</strong>
                    <p>ستظهر عمليات المزامنة هنا بعد أول مزامنة ناجحة.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sync-pagination">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="btn btn-soft btn-glass">
              السابق
            </Link>
          )}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="btn btn-soft btn-glass">
              التالي
            </Link>
          )}
        </div>
      )}
    </>
  );
}
