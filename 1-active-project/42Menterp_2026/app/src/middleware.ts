import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/stores", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stores/:path*",
    "/orders/:path*",
    "/channels/:path*",
    "/customers/:path*",
    "/settlements/:path*",
    "/keywords/:path*",
    "/work-logs/:path*",
    "/tenants/:path*",
    "/tax-invoices/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/login",
  ],
};
