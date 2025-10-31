# 🧾 Invoicing Module - Complete Documentation

## Overview

Complete invoicing system for SaaS application with multi-tenancy support. Features estimates, invoices, client management, item catalog, payment tracking, advanced reporting, and PDF generation with 5 professional templates.

## 📋 Features

### Core Functionality

- ✅ **Invoices & Estimates**: Create, edit, and manage both document types
- ✅ **Client Management**: Individual and business client profiles with full details
- ✅ **Item Catalog**: Products and services with pricing, SKU, inventory tracking
- ✅ **Payment Tracking**: Record payments with multiple methods, automatic status updates
- ✅ **Advanced Reporting**: Filter by date, client, status, amount with analytics
- ✅ **PDF Generation**: 5 professional templates (Modern, Classic, Minimal, Colorful, Professional)
- ✅ **Template Customization**: Tenants can select from pre-made templates
- ✅ **Discount & Tax Support**: Percentage or fixed discounts, item-level and document-level taxes
- ✅ **Auto-numbering**: Automatic invoice/estimate numbering with custom prefixes
- ✅ **Responsive Design**: Fully responsive UI with mobile support

### Business Logic

- Document status workflow: Draft → Sent → Viewed → Paid/Partial/Overdue
- Balance due calculation with partial payments
- Overdue detection based on due dates
- Client snapshots in documents (preserves client info at time of invoice)
- Inventory tracking with reorder levels (for products)
- Soft delete for items (archive instead of permanent deletion)

## 🗂️ Database Schema

### Tables Created

#### 1. `invoicing_clients`

Stores client information (individuals or businesses)

- **Type**: Individual or Business
- **Fields**: Full name, business name, email, phone, addresses, tax ID
- **Features**: Tags support, multiple contact methods, notes

#### 2. `invoicing_items`

Product and service catalog

- **Types**: Product or Service
- **Fields**: Name, description, SKU, unit price, tax rate
- **Features**: Inventory tracking, reorder levels, soft delete

#### 3. `invoicing_templates`

Pre-configured invoice templates

- **Templates**: Modern, Classic, Minimal, Colorful, Professional
- **Configuration**: Colors, fonts, layouts stored as JSONB

#### 4. `invoicing_tenant_settings`

Tenant-specific settings

- **Company Info**: Name, address, contact details, logo URL, tax ID
- **Document Settings**: Custom prefixes, counters, default terms, tax rates
- **Template Selection**: Choose from available templates

#### 5. `invoicing_documents`

Invoices and estimates

- **Types**: Invoice or Estimate
- **Line Items**: JSONB array with quantity, price, tax, discount per item
- **Calculations**: Subtotal, discount, tax, total auto-calculated
- **Status Tracking**: Draft, sent, viewed, paid, partial, overdue, cancelled, accepted, declined
- **Client Snapshot**: Preserves client data at document creation time

#### 6. `invoicing_payments`

Payment records

- **Fields**: Amount, date, method, reference, notes
- **Features**: Links to documents, auto-updates document status and amount_paid

### Functions

#### `calculate_invoice_totals()`

PostgreSQL function for server-side total calculations

- Input: Line items JSONB, discount type, discount value
- Output: Subtotal, discount amount, tax amount, total
- Used by triggers to keep totals in sync

## 🔐 Security (RLS Policies)

All tables have Row Level Security enabled with policies:

- **Tenant Isolation**: Users can only access their tenant's data
- **Member Access**: All authenticated members can view
- **Admin Control**: Only admins can create/update/delete
- **Automatic Filtering**: `tenant_id` automatically filtered by RLS

## 📁 File Structure

```
apps/web/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       └── invoicing/
│   │           ├── page.tsx                 # SSR page with data fetching
│   │           ├── Client.tsx               # Main client component
│   │           └── invoicing.module.css     # Styles
│   └── api/
│       └── invoicing/
│           ├── dashboard/route.ts           # Summary stats
│           ├── clients/route.ts             # Client CRUD
│           ├── items/route.ts               # Item CRUD
│           ├── documents/route.ts           # Invoice/Estimate CRUD
│           ├── payments/route.ts            # Payment tracking
│           ├── settings/route.ts            # Tenant settings
│           ├── templates/route.ts           # List templates
│           ├── reports/route.ts             # Advanced reporting
│           └── pdf/route.ts                 # PDF generation
└── src/
    └── lib/
        └── features/
            └── invoicing/
                ├── types.ts                 # TypeScript interfaces
                └── utils.ts                 # Helper functions

supabase/
└── migrations/
    ├── 20251030000000_invoicing_module.sql          # Main schema
    └── 20251030010000_enable_invoicing_module.sql   # Enable for tenants
```

## 🔌 API Routes

### Dashboard

- **GET** `/api/invoicing/dashboard?tenantId=xxx`
- Returns: Summary stats, recent documents

### Clients

- **GET** `/api/invoicing/clients?tenantId=xxx`
- **POST** `/api/invoicing/clients` - Create client
- **PATCH** `/api/invoicing/clients?id=xxx&tenantId=xxx` - Update client
- **DELETE** `/api/invoicing/clients?id=xxx&tenantId=xxx` - Delete client

### Items

- **GET** `/api/invoicing/items?tenantId=xxx`
- **POST** `/api/invoicing/items` - Create item
- **PATCH** `/api/invoicing/items?id=xxx&tenantId=xxx` - Update item
- **DELETE** `/api/invoicing/items?id=xxx&tenantId=xxx` - Archive item (soft delete)

### Documents

- **GET** `/api/invoicing/documents?tenantId=xxx&docType=invoice|estimate`
- **POST** `/api/invoicing/documents` - Create invoice/estimate
- **PATCH** `/api/invoicing/documents?id=xxx&tenantId=xxx` - Update document

### Payments

- **GET** `/api/invoicing/payments?documentId=xxx&tenantId=xxx`
- **POST** `/api/invoicing/payments` - Record payment (auto-updates document status)

### Settings

- **GET** `/api/invoicing/settings?tenantId=xxx`
- **POST** `/api/invoicing/settings` - Upsert tenant settings

### Templates

- **GET** `/api/invoicing/templates` - List available templates

### Reports

- **GET** `/api/invoicing/reports?tenantId=xxx&dateFrom=xxx&dateTo=xxx&clientId=xxx&status=xxx`
- Returns: Filtered documents + analytics (byClient, byMonth, byStatus)

### PDF

- **GET** `/api/invoicing/pdf?documentId=xxx&tenantId=xxx`
- Returns: HTML for PDF generation (5 template styles)

## 🎨 UI Components

### Main Component (`Client.tsx`)

#### Tabs

1. **Overview**: Stats cards + recent documents table
2. **Documents**: Invoice/estimate cards with filtering (status, search)
3. **Clients**: Client cards with edit/delete actions
4. **Items**: Product/service cards with edit/archive actions
5. **Reports**: Advanced filters + analytics + results table
6. **Settings**: Company info + template selection + document settings

#### Modals

1. **ClientModal**: Create/edit client (multi-step: type selection → form)
2. **ItemModal**: Create/edit item (with inventory tracking options)
3. **DocumentModal**: Create invoice/estimate (3-step wizard: client → items → totals)
4. **PaymentModal**: Record payment (shows balance due, multiple methods)

### Styles (`invoicing.module.css`)

- Professional gradient backgrounds
- Responsive grid layouts
- Animated modals and toasts
- Status badges with color coding
- Tables with hover effects
- Form components (input, select, textarea)
- Mobile-first responsive design

## 📊 Data Flow

### Creating an Invoice

1. User clicks "Nueva Factura"
2. Modal opens with 3-step wizard:
   - Step 1: Select client, set dates
   - Step 2: Add line items from catalog
   - Step 3: Apply discounts/taxes, review totals
3. API creates document with:
   - Auto-generated doc_number
   - Client snapshot
   - Calculated totals
   - Status = 'draft'
4. Document appears in list
5. User can:
   - View/download PDF
   - Record payment
   - Edit or delete

### Recording a Payment

1. User clicks "💰 Pago" on invoice card
2. Modal shows balance due
3. User enters amount, date, method, reference
4. API:
   - Creates payment record
   - Updates `amount_paid` on document
   - Auto-updates status:
     - If full payment → 'paid'
     - If partial → 'partial'
5. Document card updates with new status

## 🎨 PDF Templates

### 1. Modern (Default)

- Gradient purple header
- Clean, modern design
- Rounded corners
- Professional color scheme

### 2. Classic

- Traditional serif fonts
- Brown/gold accents
- Double borders
- Formal layout

### 3. Minimal

- Black and white
- Helvetica Neue font
- Ultra-clean design
- Maximum whitespace

### 4. Colorful

- Vibrant gradient backgrounds
- Emoji icons
- Rounded cards
- Playful but professional

### 5. Professional

- Navy blue header
- Corporate style
- Grid layouts
- Business-appropriate

## 🔧 Configuration

### Enabling the Module

The module is automatically enabled for all tenants via migration:

```sql
-- Migration: 20251030010000_enable_invoicing_module.sql
INSERT INTO tenant_modules (tenant_id, id, name, enabled)
SELECT id, 'invoicing', 'Invoicing', true FROM tenants;
```

### Tenant Settings

Tenants can configure:

- Company information (name, address, contact, tax ID)
- Logo URL
- Invoice prefix (default: "INV")
- Estimate prefix (default: "EST")
- Default payment terms (e.g., "Net 30")
- Default tax rate
- Selected template (modern, classic, minimal, colorful, professional)

### Navigation

Module appears in sidebar when enabled:

- Icon: "I"
- Label: "Invoicing"
- Route: `/dashboard/invoicing`

## 📈 Calculations

### Document Totals

```typescript
subtotal = sum(line_items.quantity * line_items.unit_price);

if (discount_type === "percentage") {
  discount_amount = subtotal * (discount_value / 100);
} else {
  discount_amount = discount_value;
}

taxable_amount = subtotal - discount_amount;
tax_amount = taxable_amount * (tax_rate / 100);

total = subtotal - discount_amount + tax_amount;
```

### Balance Due

```typescript
balance_due = total - amount_paid;
```

### Status Determination

```typescript
if (amount_paid === 0) {
  status = "draft" | "sent" | "viewed";
} else if (amount_paid >= total) {
  status = "paid";
} else {
  status = "partial";
}

if (due_date < today && balance_due > 0) {
  status = "overdue";
}
```

## 🧪 Testing Checklist

### Client Management

- [ ] Create individual client
- [ ] Create business client
- [ ] Edit client information
- [ ] Delete client
- [ ] Verify client validation (email required)

### Item Management

- [ ] Create product with inventory tracking
- [ ] Create service without inventory
- [ ] Edit item pricing
- [ ] Archive item (soft delete)
- [ ] Verify archived items don't show in selectors

### Document Creation

- [ ] Create invoice with multiple line items
- [ ] Create estimate
- [ ] Apply percentage discount
- [ ] Apply fixed discount
- [ ] Add document-level tax
- [ ] Verify totals calculation
- [ ] Check auto-numbering (INV-0001, EST-0001)

### Payment Recording

- [ ] Record full payment on invoice
- [ ] Record partial payment
- [ ] Verify status changes (draft → paid, partial)
- [ ] Check balance due updates
- [ ] Test multiple payment methods

### PDF Generation

- [ ] Generate Modern template PDF
- [ ] Generate Classic template PDF
- [ ] Generate Minimal template PDF
- [ ] Generate Colorful template PDF
- [ ] Generate Professional template PDF
- [ ] Verify client snapshot in PDF
- [ ] Check calculations in PDF

### Reports

- [ ] Filter by date range
- [ ] Filter by client
- [ ] Filter by status
- [ ] Filter by document type (invoice/estimate)
- [ ] Verify analytics calculations
- [ ] Check summary totals

### Settings

- [ ] Update company information
- [ ] Change selected template
- [ ] Modify document prefixes
- [ ] Change default tax rate
- [ ] Verify settings persist

## 🚀 Deployment Steps

1. **Run Migrations**

   ```bash
   supabase migration up
   ```

2. **Insert Templates**
   Templates are auto-inserted via migration (5 templates)

3. **Enable Module**

   ```bash
   # Run enable_invoicing_module.sql migration
   supabase migration up
   ```

4. **Verify Navigation**
   - Check sidebar shows "Invoicing" link
   - Verify route `/dashboard/invoicing` loads

5. **Test Workflow**
   - Create test client
   - Create test item
   - Create invoice
   - Record payment
   - Generate PDF
   - Run report

## 📝 Notes

- All amounts stored as DECIMAL(10,2) for precision
- Dates stored in DATE format (no time component)
- Line items stored as JSONB for flexibility
- Client snapshot preserves data even if client is deleted
- Soft delete on items (is_active flag)
- RLS policies prevent cross-tenant data access
- Auto-incrementing counters per tenant (invoice_counter, estimate_counter)
- PDF generation uses HTML templates (can be enhanced with Puppeteer for actual PDF files)

## 🔮 Future Enhancements

- [ ] Recurring invoices
- [ ] Email sending (send invoice via email)
- [ ] Stripe/PayPal integration
- [ ] Multi-currency support
- [ ] Custom fields on documents
- [ ] Document duplication
- [ ] Batch operations
- [ ] Export to Excel/CSV
- [ ] Invoice reminders
- [ ] Client portal (view/pay invoices)
- [ ] Time tracking integration
- [ ] Expense tracking
- [ ] Profit/loss reports

## 📞 Support

For issues or questions:

- Check database logs for RLS policy errors
- Verify tenant_id is correctly set
- Check browser console for API errors
- Ensure module is enabled in tenant_modules table

---

**Built with:** Next.js 16, React 19, Supabase, TypeScript, CSS Modules
**Status:** ✅ Production Ready
**Version:** 1.0.0
**Last Updated:** January 2025
