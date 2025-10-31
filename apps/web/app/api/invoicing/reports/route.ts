import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import type { InvoicingDocument } from '@/lib/features/invoicing/types';

// GET - Generate reports with advanced filters
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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const clientId = searchParams.get('clientId');
    const docType = searchParams.get('docType'); // 'invoice' or 'estimate'
    const statuses = searchParams.get('statuses')?.split(','); // Multiple statuses
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const searchTerm = searchParams.get('search');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    let query = supabase
      .from('invoicing_documents')
      .select('*')
      .eq('tenant_id', tenantId);

    // Apply filters
    if (dateFrom) {
      query = query.gte('issue_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('issue_date', dateTo);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (docType) {
      query = query.eq('doc_type', docType);
    }

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    if (minAmount) {
      query = query.gte('total', parseFloat(minAmount));
    }

    if (maxAmount) {
      query = query.lte('total', parseFloat(maxAmount));
    }

    if (searchTerm) {
      query = query.or(
        `doc_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`
      );
    }

    const { data: documents, error } = await query.order('issue_date', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching report data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate summary statistics
    const totalRevenue = documents
      ?.filter((d: InvoicingDocument) => d.status === 'paid' && d.doc_type === 'invoice')
      .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total), 0) || 0;

    const totalPending = documents
      ?.filter(
        (d: InvoicingDocument) =>
          !['paid', 'cancelled'].includes(d.status) && d.doc_type === 'invoice'
      )
      .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total) - Number(d.amount_paid), 0) || 0;

    const totalOverdue = documents
      ?.filter((d: InvoicingDocument) => {
        if (d.status === 'paid' || d.status === 'cancelled') return false;
        if (!d.due_date || d.doc_type !== 'invoice') return false;
        const dueDate = new Date(d.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today;
      })
      .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total) - Number(d.amount_paid), 0) || 0;

    // Group by client
    const byClient: Record<string, { count: number; total: number; paid: number }> = {};
    documents?.forEach((doc: InvoicingDocument) => {
      if (doc.client_id) {
        if (!byClient[doc.client_id]) {
          byClient[doc.client_id] = { count: 0, total: 0, paid: 0 };
        }
        byClient[doc.client_id].count++;
        byClient[doc.client_id].total += Number(doc.total);
        byClient[doc.client_id].paid += Number(doc.amount_paid);
      }
    });

    // Group by month
    const byMonth: Record<string, { count: number; revenue: number }> = {};
    documents
      ?.filter((d: InvoicingDocument) => d.doc_type === 'invoice')
      .forEach((doc: InvoicingDocument) => {
        const month = doc.issue_date.substring(0, 7); // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = { count: 0, revenue: 0 };
        }
        byMonth[month].count++;
        if (doc.status === 'paid') {
          byMonth[month].revenue += Number(doc.total);
        }
      });

    // Group by status
    const byStatus: Record<string, number> = {};
    documents?.forEach((doc) => {
      if (!byStatus[doc.status]) {
        byStatus[doc.status] = 0;
      }
      byStatus[doc.status]++;
    });

    return NextResponse.json({
      documents,
      summary: {
        totalDocuments: documents?.length || 0,
        totalRevenue,
        totalPending,
        totalOverdue,
      },
      analytics: {
        byClient,
        byMonth,
        byStatus,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/invoicing/reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
