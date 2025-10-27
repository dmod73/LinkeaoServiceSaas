import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "../../styles/sections.module.css";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServerSupabase } from "@/lib/supabase/server";
import { TenantSlugForm } from "./TenantSlugForm";
import { ChangePasswordForm, type PasswordFormState } from "./ChangePasswordForm";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function changePassword(_: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  "use server";
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "No autenticado" };

  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  if (newPassword.length < 12) {
    return { error: "La contraseña debe tener al menos 12 caracteres." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    console.error("[settings] change password error", error);
    return { error: error.message ?? "No pudimos actualizar la contraseña." };
  }

  return { success: "Contraseña actualizada correctamente." };
}

export default async function SettingsPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const slugUpdated = params?.updatedSlug === "1";
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const supabase = await getServerSupabase();
  const tenantId = params?.slug?.toString() ?? currentUser.tenantId;

  if (!tenantId) {
    return (
      <div className={styles.settings}>
        <h1>Configuracion del tenant</h1>
        <p>Aun no tienes un tenant asignado. Crea uno desde el onboarding para continuar.</p>
        <Link href="/dashboard">Volver al resumen</Link>
      </div>
    );
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("id", tenantId)
    .maybeSingle();

  return (
    <div className={styles.settings}>
      <h1>Configuracion del tenant</h1>
      <p>Actualiza el slug que usaremos para dominios y subdominios dedicados.</p>
      {slugUpdated ? <p style={{ color: "#a7f3d0" }}>Slug actualizado correctamente.</p> : null}
      {tenant ? (
        <TenantSlugForm tenantId={tenant.id} currentSlug={tenant.id} />
      ) : (
        <p>No pudimos cargar la informacion del tenant.</p>
      )}

      <div className={styles.passwordCard}>
        <div>
          <h2>Cambiar contraseña</h2>
          <p>Actualiza la contraseña de tu cuenta. Utiliza una frase segura con al menos 12 caracteres.</p>
        </div>
        <ChangePasswordForm action={changePassword} />
      </div>
    </div>
  );
}
