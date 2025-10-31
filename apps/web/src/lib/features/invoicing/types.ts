// =====================================================
// INVOICING MODULE - TypeScript Types
// =====================================================

export type ClientType = 'individual' | 'business';

export interface InvoicingClient {
  id: string;
  tenant_id: string;
  client_type: ClientType;
  full_name?: string;
  business_name?: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  notes?: string;
  tags?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type ItemType = 'product' | 'service';

export interface InvoicingItem {
  id: string;
  tenant_id: string;
  item_type: ItemType;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  currency: string;
  taxable: boolean;
  tax_rate: number;
  track_inventory: boolean;
  quantity_in_stock: number;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoicingTemplate {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
  layout: {
    style: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    headerStyle: string;
    showLogo: boolean;
  };
  is_active: boolean;
  created_at?: string;
}

export interface InvoicingTenantSettings {
  tenant_id: string;
  selected_template_id?: string;
  company_name?: string;
  company_logo_url?: string;
  company_email?: string;
  company_phone?: string;
  company_website?: string;
  company_address_line1?: string;
  company_address_line2?: string;
  company_city?: string;
  company_state?: string;
  company_postal_code?: string;
  company_country?: string;
  company_tax_id?: string;
  invoice_prefix: string;
  estimate_prefix: string;
  next_invoice_number: number;
  next_estimate_number: number;
  default_payment_terms?: string;
  default_notes?: string;
  default_tax_rate: number;
  custom_fields?: Record<string, any>;
  updated_at?: string;
}

export type DocumentType = 'invoice' | 'estimate';

export type DocumentStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'paid' 
  | 'partial' 
  | 'overdue' 
  | 'cancelled'
  | 'accepted' 
  | 'declined';

export type DiscountType = 'percentage' | 'fixed';

export interface DocumentLineItem {
  item_id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount?: number;
}

export interface InvoicingDocument {
  id: string;
  tenant_id: string;
  doc_type: DocumentType;
  doc_number: string;
  client_id?: string;
  client_snapshot?: Partial<InvoicingClient>;
  issue_date: string;
  due_date?: string;
  status: DocumentStatus;
  items?: any[];  // Database column name
  line_items: DocumentLineItem[];  // Frontend usage (maps to items)
  subtotal: number;
  discount_type?: DiscountType;
  discount_value: number;
  discount_amount?: number;  // Optional
  tax_total?: number;  // Database column name
  tax_amount?: number;  // Frontend usage (maps to tax_total)
  total: number;
  amount_paid: number;
  currency: string;
  payment_terms?: string;
  notes?: string;
  private_notes?: string;
  template_id?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  pdf_url?: string;
  pdf_generated_at?: string;
  sent_at?: string;
  viewed_at?: string;
  paid_at?: string;
  converted_to_invoice?: boolean;  // For estimates converted to invoices
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoicingPayment {
  id: string;
  tenant_id: string;
  document_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

// ============= DASHBOARD DATA =============

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

// ============= REPORT FILTERS =============

export interface InvoicingReportFilters {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  status?: DocumentStatus[];
  docType?: DocumentType;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}

// ============= CREATE/UPDATE PAYLOADS =============

export interface CreateClientPayload {
  tenant_id: string;
  client_type: ClientType;
  full_name?: string;
  business_name?: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateItemPayload {
  tenant_id: string;
  item_type: ItemType;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  currency: string;
  taxable: boolean;
  tax_rate: number;
  track_inventory: boolean;
  quantity_in_stock: number;
}

export interface CreateDocumentPayload {
  tenant_id: string;
  doc_type: DocumentType;
  client_id?: string;
  issue_date: string;
  due_date?: string;
  items: DocumentLineItem[];
  discount_type?: DiscountType;
  discount_value?: number;
  payment_terms?: string;
  notes?: string;
  private_notes?: string;
  template_id?: string;
  tags?: string[];
}

export interface CreatePaymentPayload {
  tenant_id: string;
  document_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}
