import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

  // Obtener todos los clientes únicos del tenant
  const { data: clients, error } = await supabase
    .from("appointment_clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }

  return NextResponse.json({
    clients: clients?.map((c) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      createdAt: c.created_at,
    })) || [],
  });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { fullName, email, phone } = body;

  if (!fullName) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  // Crear cliente
  const { data: client, error } = await supabase
    .from("appointment_clients")
    .insert({
      tenant_id: tenantId,
      full_name: fullName,
      email,
      phone,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }

  return NextResponse.json({
    client: {
      id: client.id,
      fullName: client.full_name,
      email: client.email,
      phone: client.phone,
    },
  });
}

export async function DELETE(req: NextRequest) {
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

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID de cliente requerido" }, { status: 400 });
  }

  // Verificar que el cliente pertenece al tenant
  const { data: existingClient } = await supabase
    .from("appointment_clients")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!existingClient) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Verificar si el cliente tiene citas asociadas
  const { data: appointments } = await supabase
    .from("appointment_appointments")
    .select("id")
    .eq("client_id", id)
    .limit(1);

  if (appointments && appointments.length > 0) {
    return NextResponse.json({ 
      error: "No se puede eliminar el cliente porque tiene citas asociadas" 
    }, { status: 400 });
  }

  // Eliminar cliente
  const { error } = await supabase
    .from("appointment_clients")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Cliente eliminado correctamente" });
}
