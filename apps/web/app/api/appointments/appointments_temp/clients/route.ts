import { NextResponse } from "next/server";
import type { Role } from "@core/shared";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getTenantContext, isModuleEnabledForTenant } from "@/lib/features/moduleAccess";

type ClientUpsertBody = {
  id?: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
};

const OWNER_ROLES: Role[] = ["admin", "system_admin"];

function ensureOwnerRole(role: Role | null | undefined): role is "admin" | "system_admin" {
  return Boolean(role && OWNER_ROLES.includes(role));
}

async function resolveTenantIdFromRequest(req?: Request): Promise<{ tenantId: string | null; role: Role | null }> {
  const headerTenant = req?.headers.get("x-tenant-id");
  const context = await getTenantContext();
  const tenantId = context?.tenantId ?? headerTenant ?? null;
  const role = context?.role ?? null;
  return { tenantId, role };
}

export async function GET(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const tenantId = context.tenantId ?? req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const moduleEnabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!moduleEnabled) {
      return NextResponse.json({ clients: [] });
    }

    const isOwner = ensureOwnerRole(context.role ?? currentUser.role);

    if (!isOwner) {
      const service = getServiceSupabase();
      const { data, error } = await service
        .from("appointments_clients")
        .select("id, tenant_id, full_name, email, phone, created_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (error) {
        console.error("[invoice] client self fetch", error);
        return NextResponse.json({ error: "No pudimos obtener tus datos" }, { status: 500 });
      }

      return NextResponse.json({
        client: data
          ? {
              id: data.id,
              fullName: data.full_name,
              email: data.email,
              phone: data.phone,
              createdAt: data.created_at
            }
          : null
      });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.toLowerCase().trim();

    const service = getServiceSupabase();
    let query = service
      .from("appointments_clients")
      .select("id, full_name, email, phone, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[invoice] clients list", error);
      return NextResponse.json({ error: "No pudimos cargar los clientes" }, { status: 500 });
    }

    return NextResponse.json({
      clients: (data ?? []).map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error("[invoice] clients GET", error);
    return NextResponse.json({ error: "No pudimos obtener los clientes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const tenantId = context.tenantId ?? req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const moduleEnabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!moduleEnabled) {
  return NextResponse.json({ error: "El módulo Appointments no está habilitado" }, { status: 412 });
    }

    const body = (await req.json()) as ClientUpsertBody;
    const isOwner = ensureOwnerRole(context.role ?? currentUser.role);

    if (!isOwner && !body.fullName) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const service = getServiceSupabase();

    const payload = {
      id: body.id?.trim() || undefined,
      tenant_id: tenantId,
      user_id: isOwner ? null : currentUser.id,
      full_name: body.fullName?.trim() ?? currentUser.fullName ?? "Cliente",
      email: body.email?.trim()?.toLowerCase() ?? null,
      phone: body.phone?.trim() ?? null,
      updated_at: new Date().toISOString()
    };

    const response = await service
      .from("appointments_clients")
      .upsert(payload, { onConflict: "id" })
      .select("id, full_name, email, phone, created_at, updated_at")
      .single();

    if (response.error) {
      console.error("[invoice] client upsert", response.error);
      return NextResponse.json({ error: "No pudimos guardar el cliente" }, { status: 500 });
    }

    return NextResponse.json({
      client: {
        id: response.data.id,
        fullName: response.data.full_name,
        email: response.data.email,
        phone: response.data.phone,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      }
    });
  } catch (error) {
    console.error("[invoice] clients POST", error);
    return NextResponse.json({ error: "No pudimos guardar el cliente" }, { status: 500 });
  }
}
