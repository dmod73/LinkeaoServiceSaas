import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { InvoicingTenantSettings } from '@/lib/features/invoicing/types';

// GET - Get tenant settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { data: settings, error } = await supabase
      .from('invoicing_tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    // If settings don't exist, return default values
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        settings: {
          tenant_id: tenantId,
          invoice_prefix: 'INV',
          estimate_prefix: 'EST',
          next_invoice_number: 1,
          next_estimate_number: 1,
          default_payment_terms: 'Net 30',
          default_tax_rate: 0,
        },
      });
    }

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in GET /api/invoicing/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST/PATCH - Upsert tenant settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Partial<InvoicingTenantSettings> & { tenant_id: string } =
      await request.json();

    if (!body.tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const { data: settings, error } = await supabase
      .from('invoicing_tenant_settings')
      .upsert(
        {
          ...body,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'tenant_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in POST /api/invoicing/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
