-- =====================================================
-- INVOICING MODULE - Complete Invoicing System
-- =====================================================
-- Features:
-- - Clients management
-- - Products/Services catalog
-- - Invoices & Estimates
-- - Customizable templates
-- - Tax & Discount support
-- - PDF generation
-- - Advanced reporting with filters
-- =====================================================

-- ============= MODULE REGISTRATION =============
insert into public.modules (id, name, description, is_free)
values ('invoicing', 'Facturación', 'Sistema completo de facturación con estimados, facturas, clientes y reportes avanzados.', false)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_free = excluded.is_free;

-- ============= CLIENTS TABLE =============
create table if not exists public.invoicing_clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  
  -- Client Information
  client_type text not null default 'individual' check (client_type in ('individual', 'business')),
  full_name text,
  business_name text,
  email text not null,
  phone text,
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text default 'US',
  
  -- Tax & Legal
  tax_id text, -- RFC, Tax ID, EIN, etc.
  
  -- Metadata
  notes text,
  tags text[],
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists invoicing_clients_tenant_idx on public.invoicing_clients (tenant_id, created_at desc);
create index if not exists invoicing_clients_email_idx on public.invoicing_clients (tenant_id, email);

-- ============= PRODUCTS/SERVICES TABLE =============
create table if not exists public.invoicing_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  
  -- Item Information
  item_type text not null default 'service' check (item_type in ('product', 'service')),
  name text not null,
  description text,
  sku text,
  
  -- Pricing
  unit_price decimal(10, 2) not null default 0,
  currency text not null default 'USD',
  
  -- Tax
  taxable boolean default true,
  tax_rate decimal(5, 2) default 0, -- Percentage
  
  -- Inventory (for products)
  track_inventory boolean default false,
  quantity_in_stock integer default 0,
  
  -- Metadata
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists invoicing_items_tenant_idx on public.invoicing_items (tenant_id, is_active, name);
create index if not exists invoicing_items_sku_idx on public.invoicing_items (tenant_id, sku) where sku is not null;

-- ============= INVOICE TEMPLATES TABLE =============
create table if not exists public.invoicing_templates (
  id text primary key,
  name text not null,
  description text,
  preview_url text,
  
  -- Template Configuration
  layout jsonb not null default '{}'::jsonb,
  -- Example: { "style": "modern", "colors": {...}, "sections": [...] }
  
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============= TENANT TEMPLATE SETTINGS =============
create table if not exists public.invoicing_tenant_settings (
  tenant_id text primary key references public.tenants(id) on delete cascade,
  
  -- Template Selection
  selected_template_id text references public.invoicing_templates(id),
  
  -- Company Information for Invoices
  company_name text,
  company_logo_url text,
  company_email text,
  company_phone text,
  company_website text,
  
  -- Company Address
  company_address_line1 text,
  company_address_line2 text,
  company_city text,
  company_state text,
  company_postal_code text,
  company_country text default 'US',
  
  -- Tax & Legal
  company_tax_id text,
  
  -- Invoice Settings
  invoice_prefix text default 'INV',
  estimate_prefix text default 'EST',
  next_invoice_number integer default 1,
  next_estimate_number integer default 1,
  
  -- Default Terms & Notes
  default_payment_terms text default 'Net 30',
  default_notes text,
  default_tax_rate decimal(5, 2) default 0,
  
  -- Customization
  custom_fields jsonb default '{}'::jsonb,
  
  updated_at timestamptz default now()
);

-- ============= INVOICES & ESTIMATES TABLE =============
create table if not exists public.invoicing_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  
  -- Document Type
  doc_type text not null check (doc_type in ('invoice', 'estimate')),
  
  -- Document Number
  doc_number text not null,
  
  -- Client Reference
  client_id uuid references public.invoicing_clients(id) on delete set null,
  client_snapshot jsonb, -- Store client data at time of creation
  
  -- Dates
  issue_date date not null,
  due_date date,
  
  -- Status
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'accepted', 'declined')
  ),
  
  -- Line Items
  items jsonb not null default '[]'::jsonb,
  -- Example: [{ "item_id": "uuid", "name": "...", "description": "...", "quantity": 1, "unit_price": 100, "tax_rate": 10, "discount": 0 }]
  
  -- Totals
  subtotal decimal(10, 2) not null default 0,
  discount_type text check (discount_type in ('percentage', 'fixed')),
  discount_value decimal(10, 2) default 0,
  tax_total decimal(10, 2) not null default 0,
  total decimal(10, 2) not null default 0,
  
  -- Payment Information
  amount_paid decimal(10, 2) default 0,
  currency text not null default 'USD',
  
  -- Terms & Notes
  payment_terms text,
  notes text,
  private_notes text, -- Only visible to tenant
  
  -- Template
  template_id text references public.invoicing_templates(id),
  
  -- Metadata
  tags text[],
  custom_fields jsonb default '{}'::jsonb,
  
  -- PDF Generation
  pdf_url text,
  pdf_generated_at timestamptz,
  
  -- Tracking
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Unique constraint for document numbers per tenant
  unique (tenant_id, doc_type, doc_number)
);

create index if not exists invoicing_documents_tenant_idx on public.invoicing_documents (tenant_id, doc_type, issue_date desc);
create index if not exists invoicing_documents_client_idx on public.invoicing_documents (client_id, issue_date desc);
create index if not exists invoicing_documents_status_idx on public.invoicing_documents (tenant_id, status, issue_date desc);
create index if not exists invoicing_documents_number_idx on public.invoicing_documents (tenant_id, doc_number);

-- ============= PAYMENT RECORDS TABLE =============
create table if not exists public.invoicing_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.invoicing_documents(id) on delete cascade,
  
  -- Payment Information
  amount decimal(10, 2) not null,
  currency text not null default 'USD',
  payment_date date not null,
  payment_method text, -- e.g., 'cash', 'check', 'transfer', 'card'
  
  -- Reference
  reference_number text,
  notes text,
  
  -- Metadata
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists invoicing_payments_document_idx on public.invoicing_payments (document_id, payment_date desc);
create index if not exists invoicing_payments_tenant_idx on public.invoicing_payments (tenant_id, payment_date desc);

-- ============= DEFAULT TEMPLATES =============
insert into public.invoicing_templates (id, name, description, preview_url, layout)
values
  ('modern', 'Moderno', 'Diseño limpio y profesional con colores azules', '/templates/modern-preview.png', 
   '{"style":"modern","primaryColor":"#3b82f6","secondaryColor":"#1e40af","fontFamily":"Inter","headerStyle":"bold","showLogo":true}'::jsonb),
  
  ('classic', 'Clásico', 'Diseño tradicional con líneas limpias', '/templates/classic-preview.png',
   '{"style":"classic","primaryColor":"#1f2937","secondaryColor":"#6b7280","fontFamily":"Georgia","headerStyle":"elegant","showLogo":true}'::jsonb),
  
  ('minimal', 'Minimalista', 'Diseño simple y elegante', '/templates/minimal-preview.png',
   '{"style":"minimal","primaryColor":"#000000","secondaryColor":"#404040","fontFamily":"Helvetica","headerStyle":"simple","showLogo":false}'::jsonb),
  
  ('colorful', 'Colorido', 'Diseño vibrante y moderno', '/templates/colorful-preview.png',
   '{"style":"colorful","primaryColor":"#8b5cf6","secondaryColor":"#6d28d9","fontFamily":"Poppins","headerStyle":"bold","showLogo":true}'::jsonb),
  
  ('professional', 'Profesional', 'Diseño corporativo y serio', '/templates/professional-preview.png',
   '{"style":"professional","primaryColor":"#0f172a","secondaryColor":"#334155","fontFamily":"Arial","headerStyle":"corporate","showLogo":true}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  preview_url = excluded.preview_url,
  layout = excluded.layout;

-- ============= ROW LEVEL SECURITY =============

alter table public.invoicing_clients enable row level security;
alter table public.invoicing_items enable row level security;
alter table public.invoicing_templates enable row level security;
alter table public.invoicing_tenant_settings enable row level security;
alter table public.invoicing_documents enable row level security;
alter table public.invoicing_payments enable row level security;

-- Templates are public (read-only)
create policy "invoicing templates read" on public.invoicing_templates
  for select using (is_active = true);

-- Clients policies
create policy "invoicing clients read" on public.invoicing_clients
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_clients.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

create policy "invoicing clients manage" on public.invoicing_clients
  for all using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_clients.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

-- Items policies
create policy "invoicing items read" on public.invoicing_items
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_items.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

create policy "invoicing items manage" on public.invoicing_items
  for all using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_items.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

-- Settings policies
create policy "invoicing settings read" on public.invoicing_tenant_settings
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_tenant_settings.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

create policy "invoicing settings manage" on public.invoicing_tenant_settings
  for all using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_tenant_settings.tenant_id
        and m.role in ('admin', 'system_admin')
    )
  );

-- Documents policies
create policy "invoicing documents read" on public.invoicing_documents
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_documents.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

create policy "invoicing documents manage" on public.invoicing_documents
  for all using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_documents.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

-- Payments policies
create policy "invoicing payments read" on public.invoicing_payments
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_payments.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

create policy "invoicing payments manage" on public.invoicing_payments
  for all using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = invoicing_payments.tenant_id
        and m.role in ('member', 'admin', 'system_admin')
    )
  );

-- ============= FUNCTIONS FOR CALCULATIONS =============

create or replace function public.calculate_invoice_totals(
  p_items jsonb,
  p_discount_type text,
  p_discount_value decimal
)
returns table (
  subtotal decimal,
  discount_amount decimal,
  tax_total decimal,
  total decimal
) 
language plpgsql
as $$
declare
  v_subtotal decimal := 0;
  v_discount_amount decimal := 0;
  v_tax_total decimal := 0;
  v_total decimal := 0;
  v_item jsonb;
  v_line_total decimal;
  v_line_tax decimal;
begin
  -- Calculate subtotal
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line_total := (v_item->>'quantity')::decimal * (v_item->>'unit_price')::decimal;
    v_subtotal := v_subtotal + v_line_total;
  end loop;
  
  -- Calculate discount
  if p_discount_type = 'percentage' then
    v_discount_amount := v_subtotal * (p_discount_value / 100);
  elsif p_discount_type = 'fixed' then
    v_discount_amount := p_discount_value;
  end if;
  
  -- Calculate tax on items after discount
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line_total := (v_item->>'quantity')::decimal * (v_item->>'unit_price')::decimal;
    -- Apply proportional discount to this line
    v_line_total := v_line_total - (v_line_total * (v_discount_amount / v_subtotal));
    v_line_tax := v_line_total * (coalesce((v_item->>'tax_rate')::decimal, 0) / 100);
    v_tax_total := v_tax_total + v_line_tax;
  end loop;
  
  -- Calculate final total
  v_total := v_subtotal - v_discount_amount + v_tax_total;
  
  return query select v_subtotal, v_discount_amount, v_tax_total, v_total;
end;
$$;

-- ============= TRIGGER FOR UPDATED_AT =============

create or replace function public.update_invoicing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoicing_clients_updated_at
  before update on public.invoicing_clients
  for each row execute function public.update_invoicing_updated_at();

create trigger invoicing_items_updated_at
  before update on public.invoicing_items
  for each row execute function public.update_invoicing_updated_at();

create trigger invoicing_documents_updated_at
  before update on public.invoicing_documents
  for each row execute function public.update_invoicing_updated_at();

create trigger invoicing_tenant_settings_updated_at
  before update on public.invoicing_tenant_settings
  for each row execute function public.update_invoicing_updated_at();
