import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { CreatePaymentPayload } from '@/lib/features/invoicing/types';

// GET - List payments for a document or tenant
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
    const documentId = searchParams.get('documentId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    let query = supabase
      .from('invoicing_payments')
      .select('*')
      .eq('tenant_id', tenantId);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    const { data: payments, error } = await query.order('payment_date', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error in GET /api/invoicing/payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Record new payment
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

    const body: CreatePaymentPayload = await request.json();

    if (!body.tenant_id || !body.document_id || !body.amount || !body.payment_date) {
      return NextResponse.json(
        { error: 'Tenant ID, document ID, amount, and payment date are required' },
        { status: 400 }
      );
    }

    // Get current document
    const { data: document, error: docError } = await supabase
      .from('invoicing_documents')
      .select('*')
      .eq('id', body.document_id)
      .eq('tenant_id', body.tenant_id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate payment amount
    const currentPaid = Number(document.amount_paid) || 0;
    const total = Number(document.total);
    const newTotalPaid = currentPaid + Number(body.amount);

    if (newTotalPaid > total) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining balance' },
        { status: 400 }
      );
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('invoicing_payments')
      .insert({
        tenant_id: body.tenant_id,
        document_id: body.document_id,
        amount: body.amount,
        currency: body.currency || document.currency,
        payment_date: body.payment_date,
        payment_method: body.payment_method,
        reference_number: body.reference_number,
        notes: body.notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // Update document amount_paid and status
    let newStatus = document.status;
    if (newTotalPaid >= total) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    }

    const updateData: any = {
      amount_paid: newTotalPaid,
      status: newStatus,
    };

    if (newStatus === 'paid' && !document.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }

    await supabase
      .from('invoicing_documents')
      .update(updateData)
      .eq('id', body.document_id)
      .eq('tenant_id', body.tenant_id);

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/invoicing/payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete payment (and adjust document)
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
    const paymentId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!paymentId || !tenantId) {
      return NextResponse.json(
        { error: 'Payment ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('invoicing_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Get document
    const { data: document } = await supabase
      .from('invoicing_documents')
      .select('*')
      .eq('id', payment.document_id)
      .single();

    if (document) {
      // Calculate new amount_paid
      const newAmountPaid = Number(document.amount_paid) - Number(payment.amount);
      const total = Number(document.total);

      let newStatus = document.status;
      if (newAmountPaid === 0) {
        newStatus = 'sent';
      } else if (newAmountPaid < total) {
        newStatus = 'partial';
      }

      // Update document
      await supabase
        .from('invoicing_documents')
        .update({
          amount_paid: Math.max(0, newAmountPaid),
          status: newStatus,
          paid_at: newAmountPaid >= total ? document.paid_at : null,
        })
        .eq('id', payment.document_id);
    }

    // Delete payment
    const { error } = await supabase
      .from('invoicing_payments')
      .delete()
      .eq('id', paymentId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/invoicing/payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
