import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getSyncHistory } from "@/lib/github-sync";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);
  const offset = Number(searchParams.get("offset") || "0");
  const status = searchParams.get("status") || "all";
  const reason = searchParams.get("reason") || "";

  const { logs, total } = await getSyncHistory({ limit, offset, status, reason });

  return NextResponse.json({
    logs,
    total,
    hasMore: offset + limit < total,
  });
}
