import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "mq_session";

/**
 * Optimistic redirects only. The proxy never decides authorization — every layout,
 * page, Server Action and Route Handler re-validates the session against the database.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasCookie) {
    if (pathname.startsWith("/parent")) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/kid") && pathname !== "/kid/login") {
      return NextResponse.redirect(new URL("/kid/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/parent/:path*", "/kid/:path*"],
};
