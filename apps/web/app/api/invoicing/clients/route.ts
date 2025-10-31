import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { CreateClientPayload, InvoicingClient } from '@/lib/features/invoicing/types';

// GET - List all clients for tenant
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

    const { data: clients, error } = await supabase
      .from('invoicing_clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error in GET /api/invoicing/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new client
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

    const body: CreateClientPayload = await request.json();

    // Validate required fields
    if (!body.tenant_id || !body.email) {
      return NextResponse.json(
        { error: 'Tenant ID and email are required' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const { data: existing } = await supabase
      .from('invoicing_clients')
      .select('id')
      .eq('tenant_id', body.tenant_id)
      .eq('email', body.email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Client with this email already exists' },
        { status: 409 }
      );
    }

    const { data: client, error } = await supabase
      .from('invoicing_clients')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/invoicing/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update client
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: Partial<InvoicingClient> & { id: string; tenant_id: string } = await request.json();

    if (!body.id || !body.tenant_id) {
      return NextResponse.json(
        { error: 'Client ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    const { data: client, error } = await supabase
      .from('invoicing_clients')
      .update(body)
      .eq('id', body.id)
      .eq('tenant_id', body.tenant_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error in PATCH /api/invoicing/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete client
export async function DELETE(request: NextRequest) {
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
    const clientId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!clientId || !tenantId) {
      return NextResponse.json(
        { error: 'Client ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('invoicing_clients')
      .delete()
      .eq('id', clientId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/invoicing/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
