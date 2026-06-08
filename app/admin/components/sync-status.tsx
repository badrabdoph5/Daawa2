"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Github, Loader2, RefreshCw, RotateCcw, XCircle } from "lucide-react";

type SyncLogEntry = {
  id: string;
  reason: string;
  status: string;
  filesCount: number | null;
  commitSha: string | null;
  commitUrl: string | null;
  errorMessage: string | null;
  duration: number | null;
  retryCount: number;
  createdAt: string;
};

type QueueItem = {
  id: string;
  reason: string;
  status: string;
  retryCount: number;
  nextRetryAt?: number;
};

type SyncStatusData = {
  readiness: {
    configured: boolean;
    label: string;
    detail: string;
  };
  queue: {
    queueLength: number;
    isSyncing: boolean;
    items: QueueItem[];
  };
  recentLogs: SyncLogEntry[];
  lastSync: SyncLogEntry | null;
  nextRetry: number | null;
};

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `منذ ${seconds} ثانية`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function formatDuration(ms: number | null) {
  if (!ms) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="sync-status-badge sync-status-badge--completed">
        <CheckCircle2 size={12} />
        مكتمل
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="sync-status-badge sync-status-badge--processing">
        <Loader2 size={12} className="sync-spin" />
        جاري
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="sync-status-badge sync-status-badge--pending">
        <Clock size={12} />
        انتظار
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="sync-status-badge sync-status-badge--failed">
        <XCircle size={12} />
        فشل
      </span>
    );
  }
  return <span className="sync-status-badge">{status}</span>;
}

export function SyncStatus() {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sync/status", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      }
    } catch {
      setError("تعذّر تحميل حالة المزامنة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-status", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });
      await res.json();
      await fetchStatus();
    } catch {
      setError("فشل طلب المزامنة اليدوية");
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = async (logId: string, reason: string) => {
    setRetryingId(logId);
    try {
      await fetch("/api/admin/sync/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, reason }),
      });
      await fetchStatus();
    } catch {
      setError("فشل إعادة المحاولة");
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-health-card sync-status-card">
        <Github size={19} />
        <span className="admin-health-pill">
          <Loader2 size={14} className="sync-spin" />
        </span>
        <strong>مزامنة GitHub</strong>
        <small>جاري التحميل…</small>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-health-card sync-status-card">
        <Github size={19} />
        <span className="admin-health-pill danger">خطأ</span>
        <strong>مزامنة GitHub</strong>
        <small>{error || "تعذّر تحميل الحالة"}</small>
      </div>
    );
  }

  const { readiness, queue, recentLogs, lastSync, nextRetry } = data;
  const isCurrentlySyncing = queue.isSyncing || syncing;
  const pendingCount = queue.items.filter((i) => i.status === "pending" || i.status === "processing").length;
  const failedLogs = recentLogs.filter((l) => l.status === "failed");

  // Determine overall status pill
  let pillClass = readiness.configured ? "good" : "danger";
  let pillLabel = readiness.label;
  if (isCurrentlySyncing) { pillClass = "processing"; pillLabel = "جاري المزامنة"; }
  else if (failedLogs.length) { pillClass = "danger"; pillLabel = "فشل"; }
  else if (pendingCount) { pillClass = "pending"; pillLabel = `${pendingCount} في الانتظار`; }

  return (
    <div className="admin-health-card sync-status-card">
      <Github size={19} />
      <span className={`admin-health-pill ${pillClass}`}>
        {isCurrentlySyncing && <Loader2 size={12} className="sync-spin" />}
        {pillLabel}
      </span>
      <strong>مزامنة GitHub</strong>
      <small>{readiness.detail}</small>

      {lastSync && (
        <small className="sync-last-time">
          <CheckCircle2 size={11} />
          آخر مزامنة: {formatRelativeTime(lastSync.createdAt)}
          {lastSync.filesCount ? ` (${lastSync.filesCount} ملف)` : ""}
        </small>
      )}

      {nextRetry && (
        <small className="sync-next-retry">
          <Clock size={11} />
          إعادة المحاولة: {formatRelativeTime(new Date(nextRetry).toISOString())}
        </small>
      )}

      {pendingCount > 0 && (
        <small className="sync-queue-info">
          <AlertCircle size={11} />
          {pendingCount} عملية في الطابور
        </small>
      )}

      {/* Recent history (last 5) */}
      {recentLogs.length > 0 && (
        <div className="sync-recent-logs">
          {recentLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="sync-log-row">
              <StatusBadge status={log.status} />
              <span className="sync-log-reason" title={log.reason}>
                {log.reason.length > 38 ? `${log.reason.slice(0, 38)}…` : log.reason}
              </span>
              {log.duration && <span className="sync-log-duration">{formatDuration(log.duration)}</span>}
              {log.commitUrl && (
                <a href={log.commitUrl} target="_blank" rel="noopener noreferrer" className="sync-log-link" title="فتح الـ commit">
                  ↗
                </a>
              )}
              {log.status === "failed" && (
                <button
                  className="sync-retry-btn"
                  onClick={() => handleRetry(log.id, log.reason)}
                  disabled={retryingId === log.id}
                  title="إعادة المحاولة"
                  type="button"
                >
                  {retryingId === log.id ? <Loader2 size={11} className="sync-spin" /> : <RotateCcw size={11} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <small className="sync-error-msg">
          <AlertCircle size={11} />
          {error}
        </small>
      )}

      <div className="sync-actions">
        <button
          className="btn btn-soft btn-glass"
          onClick={handleManualSync}
          disabled={isCurrentlySyncing}
          type="button"
        >
          {isCurrentlySyncing ? <Loader2 size={14} className="sync-spin" /> : <RefreshCw size={14} />}
          {isCurrentlySyncing ? "جاري…" : "مزامنة الآن"}
        </button>
        <a href="/admin/sync-history" className="btn btn-soft btn-glass">
          السجل
        </a>
      </div>
    </div>
  );
}
