import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, isValidSessionToken } from "@/lib/auth";

const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/contents/import",
  "/api/publish/callback",
  "/api/catalog/products",
  "/api/catalog/drafts",
  "/api/catalog/publications",
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  )
    return NextResponse.next();

  const valid = await isValidSessionToken(
    request.cookies.get(getSessionCookieName())?.value,
  );
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/"))
    return NextResponse.json(
      { success: false, error: "Bạn cần đăng nhập." },
      { status: 401 },
    );

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico).*)"],
};
