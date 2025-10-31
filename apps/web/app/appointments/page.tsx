/**
 * @file Appointments public booking page
 * Allows clients to book appointments with the business
 */

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";
import { InvoicePublicClient } from "./Client";
import styles from "./appointments-public.module.css";

async function isAppointmentsEnabled(tenantId: string) {
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("tenant_modules")
    .select("enabled")
    .eq("tenant_id", tenantId)
    .eq("module_id", "appointments")
    .maybeSingle();

  if (error) {
    console.error("[appointments] public check", error);
    return false;
  }

  return Boolean(data?.enabled);
}

export default async function AppointmentsPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const currentUser = await getCurrentUser();
  const headerStore = await headers();
  const headerTenant = headerStore.get("x-tenant-id");
  const resolvedSearchParams = await Promise.resolve(searchParams as unknown);
  const queryTenant = Array.isArray((resolvedSearchParams as any)?.tenant)
    ? (resolvedSearchParams as any).tenant[0]
    : ((resolvedSearchParams as any)?.tenant as string | undefined);
  const tenantId = headerTenant ?? queryTenant;

  if (!tenantId) {
    return (
      <section className={styles.inactive}>
        <h1>Tenant no identificado</h1>
        <p>No pudimos determinar el tenant activo. Verifica tu dominio o añade <code>?tenant=TU_TENANT_ID</code> a la URL.</p>
      </section>
    );
  }

  const enabled = await isAppointmentsEnabled(tenantId);

  if (!enabled) {
    return (
      <section className={styles.inactive}>
        <h1>Módulo Appointments deshabilitado</h1>
        <p>El módulo de reservas no está activo para este tenant. Contacta al administrador para habilitarlo.</p>
      </section>
    );
  }

  return (
    <InvoicePublicClient
      isAuthenticated={Boolean(currentUser)}
      userEmail={currentUser?.email ?? null}
      tenantId={tenantId}
    />
  );
}
