import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET handler - list services
export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Try to get tenant_id from memberships first, fallback to profiles
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let tenantId = membership?.tenant_id;

  if (!tenantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    tenantId = profile?.tenant_id;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Sin tenant" }, { status: 403 });
  }

  const { data: services, error } = await supabase
    .from("appointment_services")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Error al obtener servicios" }, { status: 500 });
  }

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.duration_minutes,
      price: s.price,
      isActive: s.is_active
    })),
  });
}

// POST handler - create service
export async function POST(request: NextRequest) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Try to get tenant_id from memberships first, fallback to profiles
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let tenantId = membership?.tenant_id;

  if (!tenantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    tenantId = profile?.tenant_id;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Sin tenant" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, durationMinutes, price } = body;

  if (!name || !durationMinutes) {
    return NextResponse.json({ error: "Nombre y duración son requeridos" }, { status: 400 });
  }

  const { data: service, error } = await supabase
    .from("appointment_services")
    .insert({
      tenant_id: tenantId,
      name,
      description,
      duration_minutes: durationMinutes,
      price,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ 
      error: `Error al crear servicio: ${error.message}`,
      details: error 
    }, { status: 500 });
  }

  return NextResponse.json({ service });
}

// PATCH handler - update service
export async function PATCH(request: NextRequest) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Try to get tenant_id from memberships first, fallback to profiles
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let tenantId = membership?.tenant_id;

  if (!tenantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    tenantId = profile?.tenant_id;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Sin tenant" }, { status: 403 });
  }

  const body = await request.json();
  const { id, is_active } = body;

  const { data: service, error } = await supabase
    .from("appointment_services")
    .update({ is_active })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("Error updating service:", error);
    return NextResponse.json({ error: "Error al actualizar servicio" }, { status: 500 });
  }

  return NextResponse.json({ service });
}