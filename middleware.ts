import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isValidSession } from "./lib/auth";

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
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthValid = await isValidSession(sessionCookie);

  // If path is /login or /api/auth, allow access
  if (pathname === "/login" || pathname === "/api/auth") {
    // If already authenticated and trying to access /login, redirect to /
    if (pathname === "/login" && isAuthValid && process.env.APP_PASSCODE) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If passcode is not set, allow access
  if (!process.env.APP_PASSCODE) {
    return NextResponse.next();
  }

  // If session is NOT valid:
  if (!isAuthValid) {
    // Return 401 JSON for all /api/* routes
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized: A valid passcode session is required to access FanControl APIs.",
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
