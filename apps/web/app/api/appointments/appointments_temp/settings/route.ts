import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// TODO: Use env vars or shared util for these
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// GET: Get settings for a tenant
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
  }
  let { data, error } = await supabase
    .from('appointments_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  if (error && error.code === 'PGRST116') { // Not found
    // Crear registro vacío por defecto
    const { data: created, error: createError } = await supabase
      .from('appointments_settings')
      .insert({ tenant_id: tenantId })
      .select()
      .single();
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    data = created;
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PUT: Update settings for a tenant
export async function PUT(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
  }
  const body = await req.json();
  // Only allow updating allowed fields
  const allowedFields = ['slot_interval_minutes', 'business_hours', 'breaks'];
  const update: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('appointments_settings')
    .upsert({ tenant_id: tenantId, ...update }, { onConflict: 'tenant_id' })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
