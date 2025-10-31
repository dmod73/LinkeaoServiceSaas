/**
 * @file Public clients route handler for appointments
 * Allows users to get/update their client info without full authentication
 */

import { getServerSupabase } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// GET handler - get current user's client info
export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get("tenant");
  const email = searchParams.get("email");

  if (!tenantId) {
    return NextResponse.json({ client: null });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Authenticated user - find by user_id
    const { data: client } = await supabase
      .from("appointment_clients")
      .select("id, full_name, email, phone")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ client: null });
    }

    return NextResponse.json({
      client: {
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        phone: client.phone
      }
    });
  } else if (email) {
    // Unauthenticated user - find by email
    const { data: client } = await supabase
      .from("appointment_clients")
      .select("id, full_name, email, phone")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ client: null });
    }

    return NextResponse.json({
      client: {
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        phone: client.phone
      }
    });
  }

  return NextResponse.json({ client: null });
}

// POST handler - create or update client info
export async function POST(request: NextRequest) {
  const supabase = await getServerSupabase();
  const body = await request.json();
  const { tenantId, fullName, email, phone } = body;

  if (!tenantId || !fullName || !email) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Authenticated user - upsert by user_id
    const { data: client, error } = await supabase
      .from("appointment_clients")
      .upsert({
        tenant_id: tenantId,
        user_id: user.id,
        full_name: fullName,
        email,
        phone
      }, {
        onConflict: "tenant_id,user_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting client:", error);
      
      // Detectar error de correo duplicado
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('appointment_clients_email_key')) {
        return NextResponse.json({ 
          error: "Este correo ya está registrado", 
          code: "DUPLICATE_EMAIL" 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: "Error al guardar cliente" }, { status: 500 });
    }

    return NextResponse.json({
      client: {
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        phone: client.phone
      }
    });
  } else {
    // Unauthenticated user - find or create by email
    const { data: existingClient } = await supabase
      .from("appointment_clients")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .maybeSingle();

    if (existingClient) {
      // Update existing client
      const { data: client, error } = await supabase
        .from("appointment_clients")
        .update({
          full_name: fullName,
          phone
        })
        .eq("id", existingClient.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating client:", error);
        return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
      }

      return NextResponse.json({
        client: {
          id: client.id,
          fullName: client.full_name,
          email: client.email,
          phone: client.phone
        }
      });
    } else {
      // Create new client without user_id
      const { data: client, error } = await supabase
        .from("appointment_clients")
        .insert({
          tenant_id: tenantId,
          full_name: fullName,
          email,
          phone
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating client:", error);
        
        // Detectar error de correo duplicado
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('appointment_clients_email_key')) {
          return NextResponse.json({ 
            error: "Este correo ya está registrado", 
            code: "DUPLICATE_EMAIL" 
          }, { status: 409 });
        }
        
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
      }

      return NextResponse.json({
        client: {
          id: client.id,
          fullName: client.full_name,
          email: client.email,
          phone: client.phone
        }
      });
    }
  }
}
