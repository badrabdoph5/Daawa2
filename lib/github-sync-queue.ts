import { after } from "next/server";
import { syncAdminStateToGitHub, createSyncLog, isGitHubSyncAuthFailure } from "./github-sync";
import type { GitHubSyncResult } from "./github-sync";

type SyncQueueStatus = "pending" | "processing" | "completed" | "failed";

type SyncQueueItem = {
  id: string;
  reason: string;
  createSnapshot: boolean;
  timestamp: number;
  status: SyncQueueStatus;
  error?: string;
  result?: GitHubSyncResult;
  completedAt?: number;
  retryCount: number;
  nextRetryAt?: number;
  logId?: string | null;
  changeType?: string;
  affectedResource?: string;
};

const maxTrackedJobs = 50;
const syncQueue: SyncQueueItem[] = [];
const trackedJobs = new Map<string, SyncQueueItem>();
let isSyncing = false;
let syncJobCounter = 0;

// Retry delays in milliseconds: 5s, 15s, 45s
const retryDelays = [5_000, 15_000, 45_000];
const maxRetries = 3;

function scheduleQueueProcessing() {
  const runner = () => {
    processSyncQueue().catch((error) => {
      console.error("Failed to process GitHub sync queue", error);
    });
  };

  try {
    after(runner);
    return;
  } catch {
    // Outside a Next request context, fall back to the normal Node scheduler.
  }

  if (typeof setImmediate === "function") {
    setImmediate(runner);
    return;
  }

  setTimeout(runner, 0);
}

function trimTrackedJobs() {
  const completed = Array.from(trackedJobs.values())
    .filter((item) => item.status === "completed" || item.status === "failed")
    .sort((a, b) => (b.completedAt || b.timestamp) - (a.completedAt || a.timestamp));

  for (const item of completed.slice(maxTrackedJobs)) {
    trackedJobs.delete(item.id);
  }
}

export function queueGitHubSync(
  reason: string,
  options: {
    createSnapshot?: boolean;
    changeType?: string;
    affectedResource?: string;
  } = {},
) {
  const item: SyncQueueItem = {
    id: `sync-${++syncJobCounter}-${Date.now()}`,
    reason,
    createSnapshot: options.createSnapshot ?? false,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0,
    changeType: options.changeType,
    affectedResource: options.affectedResource,
  };

  syncQueue.push(item);
  trackedJobs.set(item.id, item);

  if (!isSyncing) {
    scheduleQueueProcessing();
  }

  return item.id;
}

async function scheduleRetry(item: SyncQueueItem) {
  if (item.retryCount >= maxRetries) {
    item.status = "failed";
    item.completedAt = Date.now();
    console.error(`[GitHub Sync Queue] Max retries (${maxRetries}) reached for: ${item.reason}`);
    return;
  }

  const delay = retryDelays[item.retryCount] ?? retryDelays[retryDelays.length - 1];
  item.retryCount += 1;
  item.nextRetryAt = Date.now() + delay;
  item.status = "pending";

  console.log(`[GitHub Sync Queue] Scheduling retry ${item.retryCount}/${maxRetries} in ${delay / 1000}s for: ${item.reason}`);

  setTimeout(() => {
    if (!syncQueue.includes(item)) {
      syncQueue.push(item);
    }
    if (!isSyncing) {
      scheduleQueueProcessing();
    }
  }, delay);
}

async function processSyncQueue() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    while (syncQueue.length > 0) {
      const item = syncQueue.shift();
      if (!item) break;

      // Skip items that are not yet due for retry
      if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
        syncQueue.push(item);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      item.status = "processing";

      // Create or reuse a DB log entry
      if (!item.logId) {
        item.logId = await createSyncLog({
          reason: item.reason,
          status: "processing",
          retryCount: item.retryCount,
        });
      }

      try {
        const result = await syncAdminStateToGitHub(item.reason, {
          createSnapshot: item.createSnapshot,
          logId: item.logId ?? undefined,
          retryCount: item.retryCount,
        });
        item.result = result;

        if (result.status === "failed") {
          if (result.authFailed) {
            item.status = "failed";
            item.error = result.message;
            item.completedAt = Date.now();
            console.error(`[GitHub Sync Queue] Not retrying auth failure for: ${item.reason}`);
          } else {
            await scheduleRetry(item);
          }
        } else {
          item.status = "completed";
          item.completedAt = Date.now();
        }

        console.log(`[GitHub Sync Queue] ${item.reason}:`, result.status);
      } catch (error) {
        item.error = error instanceof Error ? error.message : "Unknown error";
        console.error(`[GitHub Sync Queue Error] ${item.reason}:`, error);
        if (isGitHubSyncAuthFailure(error)) {
          item.status = "failed";
          item.completedAt = Date.now();
          console.error(`[GitHub Sync Queue] Not retrying thrown auth failure for: ${item.reason}`);
        } else {
          await scheduleRetry(item);
        }
      }

      trimTrackedJobs();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    isSyncing = false;
  }
}

export function getSyncQueueStatus() {
  return {
    queueLength: syncQueue.length,
    isSyncing,
    items: Array.from(trackedJobs.values()).map((item) => ({
      id: item.id,
      reason: item.reason,
      status: item.status,
      age: Date.now() - item.timestamp,
      error: item.error,
      result: item.result,
      completedAt: item.completedAt,
      retryCount: item.retryCount,
      nextRetryAt: item.nextRetryAt,
      changeType: item.changeType,
      affectedResource: item.affectedResource,
    })),
  };
}

export function getSyncJobStatus(jobId: string) {
  const item = trackedJobs.get(jobId);
  if (!item) return null;

  return {
    id: item.id,
    reason: item.reason,
    status: item.status,
    timestamp: item.timestamp,
    completedAt: item.completedAt,
    error: item.error,
    retryCount: item.retryCount,
    nextRetryAt: item.nextRetryAt,
  };
}

export function clearSyncQueue() {
  const count = syncQueue.length;
  for (const item of syncQueue) {
    trackedJobs.delete(item.id);
  }
  syncQueue.length = 0;
  return count;
}
