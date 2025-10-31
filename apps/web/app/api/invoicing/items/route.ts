import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { CreateItemPayload, InvoicingItem } from '@/lib/features/invoicing/types';

// GET - List all items for tenant
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

    const { data: items, error } = await supabase
      .from('invoicing_items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error in GET /api/invoicing/items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new item
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

    const body: CreateItemPayload = await request.json();

    if (!body.tenant_id || !body.name) {
      return NextResponse.json(
        { error: 'Tenant ID and name are required' },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from('invoicing_items')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/invoicing/items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update item
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

    const body: Partial<InvoicingItem> & { id: string; tenant_id: string } = await request.json();

    if (!body.id || !body.tenant_id) {
      return NextResponse.json(
        { error: 'Item ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from('invoicing_items')
      .update(body)
      .eq('id', body.id)
      .eq('tenant_id', body.tenant_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error in PATCH /api/invoicing/items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft delete item (mark as inactive)
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
    const itemId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!itemId || !tenantId) {
      return NextResponse.json(
        { error: 'Item ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('invoicing_items')
      .update({ is_active: false })
      .eq('id', itemId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/invoicing/items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
