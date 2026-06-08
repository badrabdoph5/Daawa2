import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { sendPushNotification } from "@/lib/push-notifications";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "BadrDaawa").trim();
  const body = String(formData.get("body") || "").trim();
  const url = String(formData.get("url") || "/").trim();

  if (!body) {
    return NextResponse.redirect(getRedirectUrl("/admin?notify=empty", request.headers, request.nextUrl.origin), 303);
  }

  try {
    const result = await sendPushNotification({ title, body, url });
    if (result.ok) {
      queueGitHubSync("Admin notification sent.", { createSnapshot: true });
    }
    const status = result.ok ? `sent-${result.successCount}-${result.failureCount}` : "demo";
    return NextResponse.redirect(getRedirectUrl(`/admin?notify=${status}`, request.headers, request.nextUrl.origin), 303);
  } catch (error) {
    console.error("Failed to send push notification", error);
    return NextResponse.redirect(getRedirectUrl("/admin?notify=error", request.headers, request.nextUrl.origin), 303);
  }
}
