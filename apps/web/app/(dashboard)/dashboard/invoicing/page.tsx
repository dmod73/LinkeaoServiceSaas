import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import InvoicingDashboardClient from './Client';
import type { InvoicingDashboardData, InvoicingDocument } from '@/lib/features/invoicing/types';

export const metadata = {
  title: 'Facturación - Dashboard',
  description: 'Sistema completo de facturación con estimados, facturas y reportes',
};

async function getInvoicingData(tenantId: string): Promise<InvoicingDashboardData> {
  const supabase = await getServerSupabase();

  // Check if module is enabled
  const { data: tenantModule } = await supabase
    .from('tenant_modules')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .eq('module_id', 'invoicing')
    .single();

  if (!tenantModule?.enabled) {
    return {
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
    };
  }

  // Fetch all data
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

    supabase.from('invoicing_templates').select('*').eq('is_active', true),

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

  const invoices = documents?.filter((d: InvoicingDocument) => d.doc_type === 'invoice') || [];
  const estimates = documents?.filter((d: InvoicingDocument) => d.doc_type === 'estimate') || [];

  const totalRevenue = invoices
    .filter((d: InvoicingDocument) => d.status === 'paid')
    .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total), 0);

  const pendingAmount = invoices
    .filter((d: InvoicingDocument) => !['paid', 'cancelled'].includes(d.status))
    .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total) - Number(d.amount_paid), 0);

  const paidAmount = invoices.reduce((sum: number, d: InvoicingDocument) => sum + Number(d.amount_paid), 0);

  const today = new Date();
  const overdueAmount = invoices
    .filter((d: InvoicingDocument) => {
      if (['paid', 'cancelled'].includes(d.status)) return false;
      if (!d.due_date) return false;
      const dueDate = new Date(d.due_date);
      return dueDate < today;
    })
    .reduce((sum: number, d: InvoicingDocument) => sum + Number(d.total) - Number(d.amount_paid), 0);

  return {
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
}

export default async function InvoicingPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's first tenant
  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1);

  if (!memberships || memberships.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>No tienes acceso a ningún tenant</h1>
        <p>Contacta al administrador del sistema.</p>
      </div>
    );
  }

  const tenantId = memberships[0].tenant_id;
  const initialData = await getInvoicingData(tenantId);

  return <InvoicingDashboardClient initialData={initialData} tenantId={tenantId} />;
}
