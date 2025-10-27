import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const pathname = url.pathname;

  const subdomain = host.includes(".") ? host.split(".")[0] : null;
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let tenantId: string | null = null;
  let domain: string | null = null;

  const shouldResolve =
    hasSupabaseEnv &&
    pathname !== "/api/tenant/resolve" &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/static");

  if (shouldResolve) {
    try {
      const res = await fetch(
        `${url.origin}/api/tenant/resolve?host=${encodeURIComponent(host)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const payload = await res.json();
        tenantId = payload.tenantId ?? null;
        domain = payload.domain ?? null;
      }
    } catch (error) {
      console.warn(
        "[proxy] tenant resolver skipped:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const requestHeaders = new Headers(req.headers);
  if (domain) requestHeaders.set("x-tenant-domain", domain);
  if (tenantId) requestHeaders.set("x-tenant-id", tenantId);
  if (!tenantId && subdomain && subdomain !== "www") {
    requestHeaders.set("x-tenant-id", subdomain);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
