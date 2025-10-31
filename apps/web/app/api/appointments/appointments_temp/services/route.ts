import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getTenantContext, isModuleEnabledForTenant } from "@/lib/features/moduleAccess";
import type { Role } from "@core/shared";

type UpsertServiceBody = {
  id?: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  price?: number | null;
  currency?: string | null;
  isActive?: boolean;
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
    const { tenantId } = await resolveTenantIdFromRequest(req);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!enabled) {
      return NextResponse.json({ services: [] });
    }

    const service = getServiceSupabase();
    const { data, error } = await service
      .from("appointments_services")
      .select("id, name, description, duration_minutes, price, currency, is_active")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      console.error("[invoice] services list", error);
      return NextResponse.json({ error: "No pudimos cargar los servicios" }, { status: 500 });
    }

    return NextResponse.json({
      services: (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        durationMinutes: row.duration_minutes,
        price: row.price,
        currency: row.currency,
        isActive: row.is_active
      }))
    });
  } catch (error) {
    console.error("[invoice] services GET", error);
    return NextResponse.json({ error: "No pudimos obtener los servicios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!context.tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    if (!ensureOwnerRole(context.role ?? currentUser.role)) {
      return NextResponse.json({ error: "No tienes permisos para gestionar servicios" }, { status: 403 });
    }

    const enabled = await isModuleEnabledForTenant(context.tenantId, "invoice");
    if (!enabled) {
  return NextResponse.json({ error: "El módulo Appointments no está habilitado" }, { status: 412 });
    }

    const body = (await req.json()) as UpsertServiceBody;
    const name = body.name?.trim();
    const duration = Number(body.durationMinutes ?? 0);

    if (!name || !Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json({ error: "Nombre y duracion valida son requeridos" }, { status: 400 });
    }

    const payload = {
      id: body.id?.trim() || undefined,
      tenant_id: context.tenantId,
      name,
      description: body.description?.trim() ?? null,
      duration_minutes: Math.floor(duration),
      price: body.price ?? null,
      currency: body.currency?.trim()?.slice(0, 3)?.toUpperCase() ?? "USD",
      is_active: body.isActive ?? true,
      updated_at: new Date().toISOString()
    };

    const service = getServiceSupabase();
    const response = await service
      .from("appointments_services")
      .upsert(payload, { onConflict: "id" })
      .select(
        "id, name, description, duration_minutes, price, currency, is_active, created_at, updated_at"
      )
      .single();

    if (response.error) {
      console.error("[invoice] services upsert", response.error);
      return NextResponse.json({ error: "No pudimos guardar el servicio" }, { status: 500 });
    }

    return NextResponse.json({
      service: {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        durationMinutes: response.data.duration_minutes,
        price: response.data.price,
        currency: response.data.currency,
        isActive: response.data.is_active,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      }
    });
  } catch (error) {
    console.error("[invoice] services POST", error);
    return NextResponse.json({ error: "No pudimos guardar el servicio" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "Servicio no especificado" }, { status: 400 });
    }

    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!context.tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    if (!ensureOwnerRole(context.role ?? currentUser.role)) {
      return NextResponse.json({ error: "No tienes permisos para eliminar servicios" }, { status: 403 });
    }

    const service = getServiceSupabase();
    const { error } = await service
      .from("appointments_services")
      .delete()
      .eq("tenant_id", context.tenantId)
      .eq("id", id);

    if (error) {
      console.error("[invoice] services delete", error);
      return NextResponse.json({ error: "No pudimos eliminar el servicio" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[invoice] services DELETE", error);
    return NextResponse.json({ error: "No pudimos eliminar el servicio" }, { status: 500 });
  }
}
