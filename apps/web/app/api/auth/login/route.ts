import { NextResponse } from "next/server";
import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/service";
import { ensurePrimaryMembership } from "@/lib/auth/platformAdmin";

type LoginPayload = {
  email?: string;
  password?: string;
  redirectTo?: string;
};

const MIN_PASSWORD_LENGTH = 8;
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
    const body = (await req.json()) as LoginPayload;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const redirectTo = sanitizeRedirect(body.redirectTo);

    if (!email || !password) {
      return NextResponse.json({ error: "Email y password son requeridos." }, { status: 400 });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Formato de email invalido." }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `La password debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const service = getServiceSupabase();
    const anon = getAnonSupabase();

    const lookup = await service.auth.admin.listUsers({ perPage: 200 });
    if (lookup.error) {
      console.error("[auth/login] listUsers error", lookup.error);
      return NextResponse.json({ error: "No pudimos validar tu cuenta." }, { status: 500 });
    }
    const existing = lookup.data?.users?.find((user) => user.email?.toLowerCase() === email);
    if (!existing) {
      return NextResponse.json({ error: "No encontramos una cuenta con ese email." }, { status: 404 });
    }

    const passwordAttempt = await anon.auth.signInWithPassword({ email, password });
    if (passwordAttempt.error) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
    }

    try {
      await ensurePrimaryMembership({
        service,
        userId: existing.id,
        email: existing.email ?? email,
        fullName:
          ((existing.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined) ?? null
      });
    } catch (membershipError) {
      console.error("[auth/login] membership ensure error", membershipError);
      return NextResponse.json(
        { error: "Tu cuenta existe pero no pudimos preparar el tenant. Intenta nuevamente." },
        { status: 500 }
      );
    }

    await anon.auth.signOut();

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

    return NextResponse.json({
      ok: true,
      message: "Magic link enviado. Revisa tu correo."
    });
  } catch (error) {
    console.error("[auth/login] unexpected error", error);
    return NextResponse.json({ error: "No pudimos procesar tu login." }, { status: 500 });
  }
}
