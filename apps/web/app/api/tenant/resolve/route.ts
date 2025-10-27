import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") ?? "";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase environment variables are not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase
    .from("tenant_domains")
    .select("tenant_id, domain")
    .eq("domain", host)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let tenantId = data?.tenant_id ?? null;
  if (!tenantId && host.includes(".")) {
    const guess = host.split(".")[0];
    if (guess && guess !== "www") tenantId = guess;
  }

  return NextResponse.json({ tenantId, domain: data?.domain ?? null });
}
