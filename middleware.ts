import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get("army_session")?.value;

  // 1. Allow all API routes to be handled by Route Handlers (they return proper JSON 401/403)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 2. Allow static files, favicon, Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 3. Handle Public Pages (/login, /forgot-password, /reset-password)
  const isPublicPage = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublicPage) {
    // If already logged in and visiting /login, redirect to /dashboard
    if (sessionToken && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 4. Protected Page Routes: require sessionToken
  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
