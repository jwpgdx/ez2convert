import { NextResponse } from "next/server";
import { ROUTE_ALIASES } from "./lib/config/routes";

const ALIAS_TO_CANONICAL = new Map(
  Object.entries(ROUTE_ALIASES).flatMap(([canonicalRoute, aliases]) =>
    aliases.map((alias) => [alias, canonicalRoute])
  )
);

function normalizePathname(pathname) {
  if (pathname.length <= 1) {
    return pathname;
  }
  return pathname.replace(/\/+$/, "");
}

export function proxy(request) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const canonicalRoute = ALIAS_TO_CANONICAL.get(pathname);

  if (!canonicalRoute) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = canonicalRoute;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
