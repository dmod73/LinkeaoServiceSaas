// =====================================================
// INVOICING MODULE - Dashboard Types
// =====================================================

import type {
  InvoicingClient,
  InvoicingItem,
  InvoicingTemplate,
  InvoicingTenantSettings,
  InvoicingDocument,
} from './types';

export interface InvoicingDashboardData {
  enabled: boolean;
  clients: InvoicingClient[];
  items: InvoicingItem[];
  templates: InvoicingTemplate[];
  settings?: InvoicingTenantSettings;
  recentDocuments: InvoicingDocument[];
  summary: {
    totalInvoices: number;
    totalEstimates: number;
    totalRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    paidAmount: number;
  };
}
