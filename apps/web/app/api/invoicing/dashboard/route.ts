import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { InvoicingDashboardData, InvoicingDocument } from '@/lib/features/invoicing/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant_id from query or use first tenant user belongs to
    const searchParams = request.nextUrl.searchParams;
    let tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      const { data: memberships } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        return NextResponse.json(
          { error: 'No tenant found' },
          { status: 404 }
        );
      }

      tenantId = memberships[0].tenant_id;
    }

    // Check if invoicing module is enabled
    const { data: tenantModule } = await supabase
      .from('tenant_modules')
      .select('enabled')
      .eq('tenant_id', tenantId)
      .eq('module_id', 'invoicing')
      .single();

    if (!tenantModule?.enabled) {
      return NextResponse.json<InvoicingDashboardData>({
        enabled: false,
        clients: [],
        items: [],
        templates: [],
        recentDocuments: [],
        summary: {
          totalInvoices: 0,
          totalEstimates: 0,
          totalRevenue: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          paidAmount: 0,
        },
      });
    }

    // Fetch all data in parallel
    const [
      { data: clients },
      { data: items },
      { data: templates },
      { data: settings },
      { data: documents },
    ] = await Promise.all([
      supabase
        .from('invoicing_clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),

      supabase
        .from('invoicing_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('invoicing_templates')
        .select('*')
        .eq('is_active', true),

      supabase
        .from('invoicing_tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single(),

      supabase
        .from('invoicing_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Auto-update overdue invoices
    if (documents && documents.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdueInvoices = documents.filter((d: InvoicingDocument) => 
        d.doc_type === 'invoice' &&
        d.due_date &&
        !['paid', 'cancelled', 'overdue'].includes(d.status) &&
        new Date(d.due_date) < today
      );

      // Update status to overdue
      if (overdueInvoices.length > 0) {
        await Promise.all(
          overdueInvoices.map((doc) =>
            supabase
              .from('invoicing_documents')
              .update({ status: 'overdue' })
              .eq('id', doc.id)
          )
        );
        
        // Update the local documents array to reflect the change
        documents.forEach((d: InvoicingDocument) => {
          if (overdueInvoices.some((od) => od.id === d.id)) {
            d.status = 'overdue';
          }
        });
      }
    }

    // Calculate summary statistics
    const invoices = documents?.filter((d: InvoicingDocument) => d.doc_type === 'invoice') || [];
    const estimates = documents?.filter((d: InvoicingDocument) => d.doc_type === 'estimate') || [];

    const totalRevenue = invoices
      .filter((d: InvoicingDocument) => d.status === 'paid')
      .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total), 0);

    const pendingAmount = invoices
      .filter((d: InvoicingDocument) => !['paid', 'cancelled'].includes(d.status))
      .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total) - Number(d.amount_paid), 0);

    const paidAmount = invoices.reduce(
      (sum: number, d: InvoicingDocument) => sum + Number(d.amount_paid),
      0
    );

    const today = new Date();
    const overdueAmount = invoices
      .filter((d: InvoicingDocument) => {
        if (['paid', 'cancelled'].includes(d.status)) return false;
        if (!d.due_date) return false;
        const dueDate = new Date(d.due_date);
        return dueDate < today;
      })
      .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total) - Number(d.amount_paid), 0);

    const dashboardData: InvoicingDashboardData = {
      enabled: true,
      clients: clients || [],
      items: items || [],
      templates: templates || [],
      settings: settings || undefined,
      recentDocuments: documents || [],
      summary: {
        totalInvoices: invoices.length,
        totalEstimates: estimates.length,
        totalRevenue,
        pendingAmount,
        overdueAmount,
        paidAmount,
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching invoicing dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
