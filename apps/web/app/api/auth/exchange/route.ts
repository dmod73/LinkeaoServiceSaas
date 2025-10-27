import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ExchangePayload = {
  accessToken?: string;
  refreshToken?: string;
};

export async function POST(request: Request) {
  const { accessToken, refreshToken } = (await request.json()) as ExchangePayload;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase env not configured" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set(name, value, options);
        },
        remove(name) {
          response.cookies.delete(name);
        }
      }
    }
  );

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
