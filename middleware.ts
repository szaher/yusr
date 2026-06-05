import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication (after locale prefix is stripped)
const protectedPrefixes = ["/admin", "/moderator", "/student", "/support"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix to check the route segment
  // Pathname looks like /ar/admin/dashboard or /en/student/memorization
  const segments = pathname.split("/");
  // segments[0] is "", segments[1] is locale, segments[2] is the role path
  const pathAfterLocale = segments.length >= 3 ? `/${segments.slice(2).join("/")}` : "/";

  const isProtected = protectedPrefixes.some((prefix) =>
    pathAfterLocale.startsWith(prefix)
  );

  if (isProtected) {
    // Check for next-auth v5 session cookie
    // In production, the cookie is __Secure-authjs.session-token; in dev it's authjs.session-token
    const sessionCookie =
      request.cookies.get("__Secure-authjs.session-token") ||
      request.cookies.get("authjs.session-token");

    if (!sessionCookie?.value) {
      // Determine the locale from the URL (default to "ar")
      const locale = segments[1] && routing.locales.includes(segments[1] as "ar" | "en")
        ? segments[1]
        : routing.defaultLocale;

      const loginUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Run the i18n middleware for all requests
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
