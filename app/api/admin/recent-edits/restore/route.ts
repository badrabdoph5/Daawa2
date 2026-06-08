import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { restoreBackupSnapshot } from "@/lib/backups";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function revalidateAdminState() {
  for (const path of ["/", "/admin", "/admin/recent-edits", "/admin/broadcast", "/admin/client-invitations", "/admin/templates", "/admin/music", "/admin/backups"]) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.error(`Failed to revalidate ${path} after restore`, error);
    }
  }
}

function sanitizeReturnTo(value: string) {
  return value === "/admin/backups" || value === "/admin/recent-edits" ? value : "/admin/recent-edits";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const fileName = String(formData.get("fileName") || "").trim();
  const confirmFileName = String(formData.get("confirmFileName") || "").trim();
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || ""));
  const url = getRedirectUrl(returnTo, request.headers, request.nextUrl.origin);

  if (!fileName || confirmFileName !== fileName) {
    url.searchParams.set("error", "confirm");
    return NextResponse.redirect(url, 303);
  }

  const result = await restoreBackupSnapshot(fileName);
  if (!result) {
    url.searchParams.set("error", "missing");
    return NextResponse.redirect(url, 303);
  }

  revalidateAdminState();
  queueGitHubSync(`Restored admin snapshot: ${fileName}.`);

  url.searchParams.set("restored", result.fileName);
  url.searchParams.set("before", result.beforeRestoreFileName);
  url.searchParams.set("files", String(result.restoredDataFiles));
  url.searchParams.set("uploads", String(result.restoredUploads));
  if (result.includesDatabaseDump) url.searchParams.set("db", "reference");
  return NextResponse.redirect(url, 303);
}
