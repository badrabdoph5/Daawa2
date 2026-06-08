import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { getRedirectUrl } from "@/lib/utils";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await verifyAdminSessionCookie(session))) {
      const url = getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const customerMatch = pathname.match(/^\/([^/]+)\/ad_3399(?:\/.*)?$/);
  const isCustomerLoginPage = /^\/[^/]+\/ad_3399\/login(?:\/)?$/.test(pathname);
  if (customerMatch && !isCustomerLoginPage) {
    const code = customerMatch[1];
    const session = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
    if (!(await verifyClientSessionCookie(session, code))) {
      const url = getRedirectUrl(`/${code}/ad_3399/login`, request.headers, request.nextUrl.origin);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/:code/ad_3399", "/:code/ad_3399/:path*"],
};
