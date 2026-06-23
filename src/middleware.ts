import { NextResponse, type NextRequest } from "next/server";

/**
 * Tenant auth is enforced client-side via `useAuth` (JWT in localStorage).
 * We intentionally do not redirect here based on cookies alone — that would
 * force every existing admin to re-login after deploy and breaks deep links
 * until the client hydrates.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
