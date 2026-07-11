import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/session";

export function proxy(request: NextRequest) {
  const isLoginPath = request.nextUrl.pathname.startsWith("/login");
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authed = isValidSession(session);

  if (!authed && !isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/users";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
