import { NextRequest, NextResponse } from "next/server";
import { getRequestUserSession } from "./lib/auth/session";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (icon.svg, manifest.json, sw.js, apple-touch-icon.png)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js|apple-touch-icon.png|apple-touch-icon-precomposed.png).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getRequestUserSession(request);
  const isAuthenticated = Boolean(session);

  // Public authentication routes
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isAuthPage || isAuthApi) {
    // If already authenticated and trying to access /login or /signup, redirect to dashboard
    if (isAuthPage && isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated handling
  if (!isAuthenticated) {
    // Reject all /api/* routes with 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required. Please sign in to FanControl.",
        },
        { status: 401 }
      );
    }

    // Redirect browser requests to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
