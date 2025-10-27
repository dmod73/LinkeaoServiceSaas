import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { ensurePrimaryMembership } from "@/lib/auth/platformAdmin";

type SignupPayload = {
  email?: string;
  password?: string;
  fullName?: string;
};

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SignupPayload;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const fullName = body.fullName?.trim();

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

    const lookup = await service.auth.admin.listUsers({ perPage: 200 });
    if (lookup.error) {
      console.error("[auth/signup] listUsers error", lookup.error);
      return NextResponse.json({ error: "No pudimos validar el email." }, { status: 500 });
    }

    const existing = lookup.data?.users?.find((user) => user.email?.toLowerCase() === email);
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
    }

    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined
    });

    if (created.error || !created.data?.user?.id) {
      const message = created.error?.message ?? "No se pudo crear la cuenta.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const user = created.data.user;

    const profileUpsert = await service.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: fullName ?? user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null
      },
      { onConflict: "user_id" }
    );

    if (profileUpsert.error) {
      console.error("[auth/signup] profile upsert error", profileUpsert.error);
      return NextResponse.json({ error: "No pudimos guardar tu perfil." }, { status: 500 });
    }

    try {
      await ensurePrimaryMembership({
        service,
        userId: user.id,
        email: user.email ?? null,
        fullName: fullName ?? null
      });
    } catch (membershipError) {
      console.error("[auth/signup] membership ensure error", membershipError);
      return NextResponse.json({ error: "No pudimos asociar tu cuenta al tenant." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Cuenta creada. Ahora puedes iniciar sesion." }, { status: 201 });
  } catch (error) {
    console.error("[auth/signup] unexpected error", error);
    return NextResponse.json({ error: "Ocurrio un problema creando la cuenta." }, { status: 500 });
  }
}
