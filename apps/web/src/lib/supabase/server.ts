import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function getServerSupabase() {
  const cookieStore = await cookies();
  const headerList = await headers();

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {}
    },
    global: {
      headers: {
        "x-tenant-domain": headerList.get("x-tenant-domain") ?? "",
        "x-tenant-id": headerList.get("x-tenant-id") ?? ""
      }
    }
  });
}
