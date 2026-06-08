import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getBackupFile } from "@/lib/backups";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { fileName } = await context.params;
  const backup = await getBackupFile(fileName);
  if (!backup) {
    return NextResponse.json({ error: "ملف النسخة غير موجود" }, { status: 404 });
  }

  return new NextResponse(backup.bytes, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${backup.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
