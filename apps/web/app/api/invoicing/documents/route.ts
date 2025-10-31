import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { CreateDocumentPayload, InvoicingDocument } from '@/lib/features/invoicing/types';
import { calculateDocumentTotal } from '@/lib/features/invoicing/utils';

// GET - List documents with optional filters
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
    const docType = searchParams.get('docType'); // 'invoice' or 'estimate'
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    let query = supabase
      .from('invoicing_documents')
      .select('*')
      .eq('tenant_id', tenantId);

    if (docType) {
      query = query.eq('doc_type', docType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (dateFrom) {
      query = query.gte('issue_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('issue_date', dateTo);
    }

    const { data: documents, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error in GET /api/invoicing/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new document (invoice or estimate)
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

    const body: CreateDocumentPayload = await request.json();

    if (!body.tenant_id || !body.doc_type || !body.issue_date || !body.items?.length) {
      return NextResponse.json(
        { error: 'Tenant ID, document type, issue date, and items are required' },
        { status: 400 }
      );
    }

    // Get tenant settings to generate document number
    const { data: settings } = await supabase
      .from('invoicing_tenant_settings')
      .select('*')
      .eq('tenant_id', body.tenant_id)
      .single();

    let docNumber: string;
    let nextNumber: number;

    if (body.doc_type === 'invoice') {
      const prefix = settings?.invoice_prefix || 'INV';
      nextNumber = settings?.next_invoice_number || 1;
      docNumber = `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
    } else {
      const prefix = settings?.estimate_prefix || 'EST';
      nextNumber = settings?.next_estimate_number || 1;
      docNumber = `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
    }

    // Get client snapshot if client_id provided
    let clientSnapshot = null;
    if (body.client_id) {
      const { data: client } = await supabase
        .from('invoicing_clients')
        .select('*')
        .eq('id', body.client_id)
        .single();

      if (client) {
        clientSnapshot = {
          full_name: client.full_name,
          business_name: client.business_name,
          email: client.email,
          phone: client.phone,
          address_line1: client.address_line1,
          address_line2: client.address_line2,
          city: client.city,
          state: client.state,
          postal_code: client.postal_code,
          country: client.country,
          tax_id: client.tax_id,
        };
      }
    }

    // Calculate totals
    const totals = calculateDocumentTotal(
      body.items,
      body.discount_type,
      body.discount_value || 0
    );

    // Create document
    const { data: document, error: docError } = await supabase
      .from('invoicing_documents')
      .insert({
        tenant_id: body.tenant_id,
        doc_type: body.doc_type,
        doc_number: docNumber,
        client_id: body.client_id,
        client_snapshot: clientSnapshot,
        issue_date: body.issue_date,
        due_date: body.due_date,
        status: 'draft',
        items: body.items,
        subtotal: totals.subtotal,
        discount_type: body.discount_type,
        discount_value: body.discount_value || 0,
        tax_total: totals.taxTotal,
        total: totals.total,
        amount_paid: 0,
        currency: 'USD',
        payment_terms: body.payment_terms || settings?.default_payment_terms,
        notes: body.notes,
        private_notes: body.private_notes,
        template_id: body.template_id || settings?.selected_template_id || 'modern',
        tags: body.tags,
        created_by: user.id,
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    // Update next number in settings
    if (body.doc_type === 'invoice') {
      await supabase
        .from('invoicing_tenant_settings')
        .update({ next_invoice_number: nextNumber + 1 })
        .eq('tenant_id', body.tenant_id);
    } else {
      await supabase
        .from('invoicing_tenant_settings')
        .update({ next_estimate_number: nextNumber + 1 })
        .eq('tenant_id', body.tenant_id);
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/invoicing/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update document
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

    const body: Partial<InvoicingDocument> & { id: string; tenant_id: string } =
      await request.json();

    if (!body.id || !body.tenant_id) {
      return NextResponse.json(
        { error: 'Document ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Recalculate totals if items or discount changed
    let updateData: any = { ...body };
    
    // Handle both 'items' and 'line_items' field names
    const itemsToUpdate = body.items || (body as any).line_items;

    if (itemsToUpdate) {
      const totals = calculateDocumentTotal(
        itemsToUpdate,
        body.discount_type,
        body.discount_value || 0
      );

      updateData = {
        ...updateData,
        items: itemsToUpdate, // Always use 'items' in database
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total: totals.total,
      };
      
      // Remove line_items if it exists (we use items in DB)
      delete updateData.line_items;
    }

    const { data: document, error } = await supabase
      .from('invoicing_documents')
      .update(updateData)
      .eq('id', body.id)
      .eq('tenant_id', body.tenant_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error in PATCH /api/invoicing/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete document
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
    const documentId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!documentId || !tenantId) {
      return NextResponse.json(
        { error: 'Document ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Hard delete - completely remove the document
    const { data: deletedDoc, error } = await supabase
      .from('invoicing_documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if there are any remaining documents of this type
    const { data: remainingDocs } = await supabase
      .from('invoicing_documents')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('doc_type', deletedDoc.doc_type)
      .limit(1);

    // If no remaining documents of this type, reset the counter
    if (!remainingDocs || remainingDocs.length === 0) {
      const counterField = deletedDoc.doc_type === 'invoice' 
        ? 'next_invoice_number' 
        : 'next_estimate_number';
      
      await supabase
        .from('invoicing_tenant_settings')
        .update({ [counterField]: 1 })
        .eq('tenant_id', tenantId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/invoicing/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
