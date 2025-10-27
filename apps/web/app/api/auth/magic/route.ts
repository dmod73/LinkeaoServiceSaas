import { NextResponse } from "next/server";
import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/service";

type MagicPayload = {
  email?: string;
  redirectTo?: string;
};

const DEFAULT_REDIRECT =
  process.env.NEXT_PUBLIC_AUTH_REDIRECT ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000/auth/callback";

function sanitizeRedirect(url: string | undefined): string {
  if (!url) return DEFAULT_REDIRECT;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    /* ignore invalid url */
  }
  return DEFAULT_REDIRECT;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MagicPayload;
    const email = body.email?.trim().toLowerCase() ?? "";
    const redirectTo = sanitizeRedirect(body.redirectTo);

    if (!email) {
      return NextResponse.json({ error: "Email requerido." }, { status: 400 });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Formato de email invalido." }, { status: 400 });
    }

    const service = getServiceSupabase();
    const anon = getAnonSupabase();

    const lookup = await service.auth.admin.listUsers({ perPage: 200 });
    if (lookup.error) {
      console.error("[auth/magic] listUsers error", lookup.error);
      return NextResponse.json({ error: "No pudimos validar tu cuenta." }, { status: 500 });
    }
    const existing = lookup.data?.users?.find((user) => user.email?.toLowerCase() === email);
    if (!existing) {
      return NextResponse.json(
        { error: "Necesitas crear una cuenta antes de solicitar un magic link." },
        { status: 404 }
      );
    }

    const magic = await anon.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (magic.error) {
      return NextResponse.json(
        { error: "No pudimos enviar el magic link. Intenta mas tarde." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Magic link enviado. Revisa tu correo." });
  } catch (error) {
    console.error("[auth/magic] unexpected error", error);
    return NextResponse.json({ error: "No pudimos procesar tu solicitud." }, { status: 500 });
  }
}
