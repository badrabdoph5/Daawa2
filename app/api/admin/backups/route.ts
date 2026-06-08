import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createBackupSnapshot, listBackupSnapshots } from "@/lib/backups";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  return NextResponse.json({ backups: await listBackupSnapshots() });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const backup = await createBackupSnapshot("manual");
  queueGitHubSync(`Manual backup created: ${backup.fileName}`);
  return NextResponse.redirect(getRedirectUrl(`/admin/backups?created=${encodeURIComponent(backup.fileName)}`, request.headers, request.nextUrl.origin), 303);
}
