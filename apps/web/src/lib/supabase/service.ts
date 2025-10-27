import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getServiceSupabase(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ?? requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: "public"
    },
    global: {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${serviceKey}`
      }
    }
  });
}

export function getAnonSupabase(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ?? requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: "public"
    },
    global: {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    }
  });
}
