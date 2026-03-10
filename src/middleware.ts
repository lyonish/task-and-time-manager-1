import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicRoutes = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isPublicRoute = publicRoutes.includes(pathname);

  console.log("[middleware]", pathname, "isLoggedIn:", isLoggedIn, "user:", req.auth?.user?.email ?? null);

  if (isPublicRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
