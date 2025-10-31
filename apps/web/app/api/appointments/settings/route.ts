import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const supabase = await getServerSupabase();

  // Get settings from tenant_modules
  const { data: moduleConfig, error } = await supabase
    .from("tenant_modules")
    .select("settings")
    .eq("tenant_id", tenantId)
    .eq("module_id", "appointments")
    .maybeSingle();

  if (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Error fetching settings" }, { status: 500 });
  }

  const settings = moduleConfig?.settings || {};
  
  return NextResponse.json({ 
    breaks: settings.breaks || [],
    settings: settings
  });
}

export async function PATCH(req: NextRequest) {
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
  const { businessHours, breaks } = body;

  // Actualizar horarios de atención
  if (businessHours) {
    // Eliminar horarios existentes
    await supabase
      .from("appointment_availability")
      .delete()
      .eq("tenant_id", tenantId);

    // Insertar nuevos horarios
    if (businessHours.length > 0) {
      const { error } = await supabase.from("appointment_availability").insert(
        businessHours.map((h: any) => ({
          tenant_id: tenantId,
          weekday: h.weekday,
          start_time: h.start,
          end_time: h.end,
        }))
      );

      if (error) {
        console.error("Error updating business hours:", error);
        return NextResponse.json({ 
          error: `Error al actualizar horarios: ${error.message}`,
          details: error
        }, { status: 500 });
      }
    }
  }

  // Actualizar descansos en tenant_modules
  if (breaks !== undefined) {
    // Primero buscar si ya existe una configuración
    const { data: existingConfig } = await supabase
      .from("tenant_modules")
      .select("settings")
      .eq("tenant_id", tenantId)
      .eq("module_id", "appointments")
      .maybeSingle();

    const currentSettings = existingConfig?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      breaks: breaks
    };

    // Usar upsert en lugar de update
    const { error: settingsError } = await supabase
      .from("tenant_modules")
      .upsert({
        tenant_id: tenantId,
        module_id: "appointments",
        enabled: true,
        settings: updatedSettings
      }, {
        onConflict: "tenant_id,module_id"
      });

    if (settingsError) {
      console.error("Error updating breaks:", settingsError);
      return NextResponse.json({ 
        error: `Error al actualizar descansos: ${settingsError.message}` 
      }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}