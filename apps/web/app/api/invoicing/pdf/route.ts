import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import type { InvoicingDocument, InvoicingTenantSettings } from "@/lib/features/invoicing/types";
import { formatCurrency, formatDate } from "@/lib/features/invoicing/utils";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const searchParams = req.nextUrl.searchParams;
    const documentId = searchParams.get("documentId");
    const tenantId = searchParams.get("tenantId");

    if (!documentId || !tenantId) {
      return NextResponse.json(
        { error: "Missing documentId or tenantId" },
        { status: 400 }
      );
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from("invoicing_documents")
      .select("*")
      .eq("id", documentId)
      .eq("tenant_id", tenantId)
      .single();

    if (docError || !document) {
      console.error("Document not found:", docError);
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Rename items to line_items for template compatibility
    const documentWithLineItems = {
      ...document,
      line_items: document.items || [],
      discount_amount: document.discount_value || 0,
      tax_amount: document.tax_total || 0
    };

    // Get tenant settings
    const { data: settings } = await supabase
      .from("invoicing_tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    // Get template
    const { data: template } = await supabase
      .from("invoicing_templates")
      .select("*")
      .eq("id", settings?.selected_template_id || "minimal")
      .single();

    // Generate HTML
    const html = generateInvoiceHTML(documentWithLineItems, settings, template);

    // Check if download parameter is present
    const download = req.nextUrl.searchParams.get("download");
    
    if (download === "true") {
      // Return HTML for download
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${documentWithLineItems.doc_number}.html"`,
        },
      });
    }

    // Return HTML for viewing with print styles
    const htmlWithPrintButton = `
      ${html.replace('</head>', `
        <script>
          window.onload = function() {
            // Auto print dialog for PDF save
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
        <style>
          @media print {
            body { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
          }
        </style>
      </head>`)}
    `;

    return new NextResponse(htmlWithPrintButton, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

function generateInvoiceHTML(
  document: InvoicingDocument,
  settings: InvoicingTenantSettings | null,
  template: any
): string {
  const isInvoice = document.doc_type === "invoice";
  const clientInfo = document.client_snapshot || {};

  // Choose template
  switch (template?.id) {
    case "classic":
      return generateClassicTemplate(document, settings, isInvoice, clientInfo);
    case "minimal":
      return generateMinimalTemplate(document, settings, isInvoice, clientInfo);
    case "colorful":
      return generateColorfulTemplate(document, settings, isInvoice, clientInfo);
    case "professional":
      return generateProfessionalTemplate(document, settings, isInvoice, clientInfo);
    default:
      return generateModernTemplate(document, settings, isInvoice, clientInfo);
  }
}

// ===== MODERN TEMPLATE =====
function generateModernTemplate(
  doc: InvoicingDocument,
  settings: InvoicingTenantSettings | null,
  isInvoice: boolean,
  client: any
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isInvoice ? "Invoice" : "Estimate"} ${doc.doc_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      color: #1a202c;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-info h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .company-info p { opacity: 0.9; margin: 0.25rem 0; }
    .doc-info { text-align: right; }
    .doc-number {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .doc-type {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      margin-top: 0.5rem;
    }
    .body {
      padding: 2rem;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    .info-box h3 {
      color: #667eea;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .info-box p { margin: 0.25rem 0; color: #4a5568; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
    }
    thead {
      background: #f7fafc;
    }
    th {
      padding: 0.75rem;
      text-align: left;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4a5568;
      border-bottom: 2px solid #667eea;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 1rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .item-description { color: #4a5568; }
    .item-quantity { color: #718096; font-size: 0.875rem; }
    .totals {
      margin-left: auto;
      width: 300px;
      margin-top: 2rem;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-row.total {
      border-top: 2px solid #667eea;
      font-size: 1.25rem;
      font-weight: bold;
      color: #667eea;
      margin-top: 0.5rem;
      padding-top: 1rem;
    }
    .footer {
      background: #f7fafc;
      padding: 1.5rem 2rem;
      border-top: 3px solid #667eea;
      margin-top: 2rem;
    }
    .notes {
      color: #4a5568;
      line-height: 1.6;
      font-size: 0.875rem;
    }
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .header-content { flex-direction: column; gap: 1rem; }
      .doc-info { align-items: flex-start; }
      .info-section { grid-template-columns: 1fr; gap: 1rem; }
      table { font-size: 0.75rem; }
      th, td { padding: 0.5rem 0.25rem; }
      th { font-size: 0.625rem; }
      .totals { width: 100%; }
      .totals-row { font-size: 0.875rem; }
      .totals-row.total { font-size: 1.125rem; }
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-content">
        <div class="company-info">
          <h1>${settings?.company_name || "Your Company"}</h1>
          ${settings?.company_address_line1 ? `<p>${settings.company_address_line1}</p>` : ""}
          ${settings?.company_city ? `<p>${settings.company_city}, ${settings.company_state || ""} ${settings.company_postal_code || ""}</p>` : ""}
          ${settings?.company_email ? `<p>${settings.company_email}</p>` : ""}
          ${settings?.company_phone ? `<p>${settings.company_phone}</p>` : ""}
          ${settings?.company_tax_id ? `<p>Tax ID: ${settings.company_tax_id}</p>` : ""}
        </div>
        <div class="doc-info">
          <div class="doc-number">${doc.doc_number}</div>
          <div class="doc-type">${isInvoice ? "INVOICE" : "ESTIMATE"}</div>
        </div>
      </div>
    </div>

    <div class="body">
      <div class="info-section">
        <div class="info-box">
          <h3>Bill To</h3>
          <p><strong>${client.business_name || client.full_name || "N/A"}</strong></p>
          ${client.address_line1 ? `<p>${client.address_line1}</p>` : ""}
          ${client.city ? `<p>${client.city}, ${client.state || ""} ${client.postal_code || ""}</p>` : ""}
          ${client.email ? `<p>${client.email}</p>` : ""}
          ${client.phone ? `<p>${client.phone}</p>` : ""}
          ${client.tax_id ? `<p>Tax ID: ${client.tax_id}</p>` : ""}
        </div>
        <div class="info-box">
          <h3>Document Details</h3>
          <p><strong>Issue Date:</strong> ${formatDate(doc.issue_date)}</p>
          ${doc.due_date ? `<p><strong>Due Date:</strong> ${formatDate(doc.due_date)}</p>` : ""}
          <p><strong>Status:</strong> ${doc.status.toUpperCase()}</p>
          ${doc.payment_terms ? `<p><strong>Terms:</strong> ${doc.payment_terms}</p>` : ""}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Tax</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${doc.line_items
            .map(
              (item: any) => {
                const taxAmount = (item.quantity * item.unit_price * (item.tax_rate || 0)) / 100;
                const lineTotal = item.quantity * item.unit_price + taxAmount;
                return `
            <tr>
              <td>
                <div class="item-description"><strong>${item.name || item.description}</strong></div>
              </td>
              <td class="item-quantity">${item.quantity}</td>
              <td>${formatCurrency(item.unit_price)}</td>
              <td>${item.tax_rate || 0}%</td>
              <td>${formatCurrency(lineTotal)}</td>
            </tr>
          `;
              }
            )
            .join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(doc.subtotal)}</span>
        </div>
        ${
          (doc.discount_amount ?? 0) > 0
            ? `
        <div class="totals-row">
          <span>Discount:</span>
          <span>-${formatCurrency(doc.discount_amount ?? 0)}</span>
        </div>
        `
            : ""
        }
        ${
          (doc.tax_amount ?? 0) > 0
            ? `
        <div class="totals-row">
          <span>Tax:</span>
          <span>${formatCurrency(doc.tax_amount ?? 0)}</span>
        </div>
        `
            : ""
        }
        <div class="totals-row total">
          <span>Total:</span>
          <span>${formatCurrency(doc.total)}</span>
        </div>
        ${
          isInvoice && doc.amount_paid > 0
            ? `
        <div class="totals-row">
          <span>Amount Paid:</span>
          <span>${formatCurrency(doc.amount_paid)}</span>
        </div>
        <div class="totals-row total">
          <span>Balance Due:</span>
          <span>${formatCurrency(doc.total - doc.amount_paid)}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>

    ${
      doc.notes
        ? `
    <div class="footer">
      <h3 style="margin-bottom: 0.75rem; color: #4a5568;">Notes</h3>
      <div class="notes">${doc.notes}</div>
    </div>
    `
        : ""
    }
  </div>
</body>
</html>
  `;
}

// ===== CLASSIC TEMPLATE =====
function generateClassicTemplate(
  doc: InvoicingDocument,
  settings: InvoicingTenantSettings | null,
  isInvoice: boolean,
  client: any
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${isInvoice ? "Invoice" : "Estimate"} ${doc.doc_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #f5f5f0;
      padding: 2rem;
      color: #2c2c2c;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      border: 2px solid #8b6f47;
    }
    .header {
      border-bottom: 3px double #8b6f47;
      padding: 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      color: #8b6f47;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .doc-number {
      font-size: 1.5rem;
      color: #2c2c2c;
      margin: 1rem 0;
    }
    .body { padding: 2rem; }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 2rem 0;
      padding: 1.5rem;
      border: 1px solid #d4c5b0;
      background: #fdfcfa;
    }
    .info-box h3 {
      border-bottom: 1px solid #8b6f47;
      padding-bottom: 0.5rem;
      margin-bottom: 0.75rem;
      color: #8b6f47;
    }
    .info-box p { margin: 0.25rem 0; line-height: 1.6; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
    }
    th {
      background: #8b6f47;
      color: white;
      padding: 0.75rem;
      text-align: left;
      font-weight: normal;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #d4c5b0;
    }
    .totals {
      margin-left: auto;
      width: 300px;
      border: 2px solid #8b6f47;
      padding: 1rem;
      margin-top: 2rem;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px dotted #8b6f47;
    }
    .totals-row.total {
      border-top: 2px solid #8b6f47;
      border-bottom: 2px solid #8b6f47;
      font-weight: bold;
      font-size: 1.25rem;
      margin-top: 0.5rem;
      padding: 0.75rem 0;
    }
    .footer {
      border-top: 3px double #8b6f47;
      padding: 1.5rem 2rem;
      background: #fdfcfa;
      margin-top: 2rem;
      font-style: italic;
      color: #5a5a5a;
    }
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .header h1 { font-size: 1.5rem; }
      .doc-number { font-size: 1.25rem; }
      .info-section { grid-template-columns: 1fr; gap: 1rem; }
      table { font-size: 0.75rem; }
      th, td { padding: 0.5rem 0.25rem; }
      .totals { width: 100%; padding: 0.75rem; }
      .totals-row { font-size: 0.875rem; }
      .totals-row.total { font-size: 1.125rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${settings?.company_name || "Your Company"}</h1>
      <div>${settings?.company_address_line1 || ""}</div>
      <div>${settings?.company_city || ""}, ${settings?.company_state || ""}</div>
      <div>${settings?.company_email || ""} • ${settings?.company_phone || ""}</div>
      <div class="doc-number">${isInvoice ? "INVOICE" : "ESTIMATE"} #${doc.doc_number}</div>
    </div>

    <div class="body">
      <div class="info-section">
        <div class="info-box">
          <h3>BILLED TO</h3>
          <p><strong>${client.business_name || client.full_name || "N/A"}</strong></p>
          ${client.address_line1 ? `<p>${client.address_line1}</p>` : ""}
          ${client.city ? `<p>${client.city}, ${client.state || ""}</p>` : ""}
          ${client.email ? `<p>${client.email}</p>` : ""}
        </div>
        <div class="info-box">
          <h3>DOCUMENT INFORMATION</h3>
          <p><strong>Issued:</strong> ${formatDate(doc.issue_date)}</p>
          ${doc.due_date ? `<p><strong>Due:</strong> ${formatDate(doc.due_date)}</p>` : ""}
          <p><strong>Status:</strong> ${doc.status.toUpperCase()}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>DESCRIPTION</th>
            <th>QTY</th>
            <th>RATE</th>
            <th>TAX</th>
            <th>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${doc.line_items
            .map(
              (item: any) => {
                const taxAmount = (item.quantity * item.unit_price * (item.tax_rate || 0)) / 100;
                const lineTotal = item.quantity * item.unit_price + taxAmount;
                return `
            <tr>
              <td><strong>${item.name || item.description}</strong></td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unit_price)}</td>
              <td>${item.tax_rate || 0}%</td>
              <td>${formatCurrency(lineTotal)}</td>
            </tr>
          `;
              }
            )
            .join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(doc.subtotal)}</span>
        </div>
        ${(doc.discount_amount ?? 0) > 0 ? `<div class="totals-row"><span>Discount:</span><span>-${formatCurrency(doc.discount_amount ?? 0)}</span></div>` : ""}
        ${(doc.tax_amount ?? 0) > 0 ? `<div class="totals-row"><span>Tax:</span><span>${formatCurrency(doc.tax_amount ?? 0)}</span></div>` : ""}
        <div class="totals-row total">
          <span>TOTAL:</span>
          <span>${formatCurrency(doc.total)}</span>
        </div>
      </div>
    </div>

    ${doc.notes ? `<div class="footer">${doc.notes}</div>` : ""}
  </div>
</body>
</html>
  `;
}

// ===== MINIMAL TEMPLATE =====
function generateMinimalTemplate(
  doc: InvoicingDocument,
  settings: InvoicingTenantSettings | null,
  isInvoice: boolean,
  client: any
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${isInvoice ? "Invoice" : "Estimate"} ${doc.doc_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: white;
      padding: 3rem;
      color: #000;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 2rem;
      margin-bottom: 3rem;
    }
    .company h1 {
      font-size: 1.5rem;
      font-weight: 300;
      margin-bottom: 0.5rem;
    }
    .company p {
      font-size: 0.875rem;
      color: #666;
      margin: 0.125rem 0;
    }
    .doc-number {
      text-align: right;
      font-size: 2rem;
      font-weight: 300;
    }
    .doc-type {
      font-size: 0.875rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      margin-bottom: 3rem;
    }
    .info-box h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #666;
      margin-bottom: 1rem;
    }
    .info-box p {
      font-size: 0.875rem;
      line-height: 1.6;
      margin: 0.125rem 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 3rem 0;
    }
    th {
      border-bottom: 1px solid #000;
      padding: 0.5rem 0;
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 400;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 1rem 0;
      border-bottom: 1px solid #eee;
      font-size: 0.875rem;
    }
    .totals {
      margin-left: auto;
      width: 250px;
      margin-top: 2rem;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-size: 0.875rem;
    }
    .totals-row.total {
      border-top: 1px solid #000;
      border-bottom: 3px double #000;
      font-size: 1.125rem;
      margin-top: 0.5rem;
      padding: 1rem 0;
    }
    .notes {
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
      font-size: 0.875rem;
      color: #666;
      line-height: 1.6;
    }
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .header { flex-direction: column; gap: 1rem; }
      .doc-number { text-align: left; font-size: 1.5rem; }
      .info-section { grid-template-columns: 1fr; gap: 1.5rem; }
      table { font-size: 0.75rem; }
      th, td { padding: 0.5rem 0.25rem; }
      th { font-size: 0.625rem; }
      .totals { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company">
        <h1>${settings?.company_name || "Your Company"}</h1>
        ${settings?.company_address_line1 ? `<p>${settings.company_address_line1}</p>` : ""}
        ${settings?.company_city ? `<p>${settings.company_city}, ${settings.company_state || ""}</p>` : ""}
        ${settings?.company_email ? `<p>${settings.company_email}</p>` : ""}
      </div>
      <div>
        <div class="doc-number">${doc.doc_number}</div>
        <div class="doc-type">${isInvoice ? "Invoice" : "Estimate"}</div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>To</h3>
        <p><strong>${client.business_name || client.full_name || "N/A"}</strong></p>
        ${client.address_line1 ? `<p>${client.address_line1}</p>` : ""}
        ${client.city ? `<p>${client.city}, ${client.state || ""}</p>` : ""}
        ${client.email ? `<p>${client.email}</p>` : ""}
      </div>
      <div class="info-box">
        <h3>Details</h3>
        <p>${formatDate(doc.issue_date)}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Tax</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${doc.line_items
          .map(
            (item: any) => {
              const taxAmount = (item.quantity * item.unit_price * (item.tax_rate || 0)) / 100;
              const lineTotal = item.quantity * item.unit_price + taxAmount;
              return `
          <tr>
            <td><strong>${item.name || item.description}</strong></td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${item.tax_rate || 0}%</td>
            <td>${formatCurrency(lineTotal)}</td>
          </tr>
        `;
            }
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(doc.subtotal)}</span></div>
      ${(doc.discount_amount ?? 0) > 0 ? `<div class="totals-row"><span>Discount</span><span>-${formatCurrency(doc.discount_amount ?? 0)}</span></div>` : ""}
      ${(doc.tax_amount ?? 0) > 0 ? `<div class="totals-row"><span>Tax</span><span>${formatCurrency(doc.tax_amount ?? 0)}</span></div>` : ""}
      <div class="totals-row total"><span>Total</span><span>${formatCurrency(doc.total)}</span></div>
    </div>

    ${doc.notes ? `<div class="notes">${doc.notes}</div>` : ""}
  </div>
</body>
</html>
  `;
}

// ===== COLORFUL TEMPLATE =====
function generateColorfulTemplate(
  doc: InvoicingDocument,
  settings: InvoicingTenantSettings | null,
  isInvoice: boolean,
  client: any
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${isInvoice ? "Invoice" : "Estimate"} ${doc.doc_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      padding: 2rem;
      color: #2d3748;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
    }
    .header-content { position: relative; z-index: 1; }
    .company h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .doc-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.3);
      padding: 0.5rem 1.5rem;
      border-radius: 50px;
      margin-top: 1rem;
      font-size: 1.25rem;
      backdrop-filter: blur(10px);
    }
    .body { padding: 2rem; }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 2rem 0;
    }
    .info-card {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      padding: 1.5rem;
      border-radius: 15px;
      border-left: 4px solid #667eea;
    }
    .info-card h3 {
      color: #667eea;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      text-transform: uppercase;
    }
    .info-card p { margin: 0.25rem 0; color: #4a5568; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      border-radius: 10px;
      overflow: hidden;
    }
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    th {
      padding: 1rem;
      text-align: left;
      font-weight: normal;
    }
    th:last-child, td:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #f7fafc; }
    td { padding: 1rem; }
    .totals {
      margin-left: auto;
      width: 320px;
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      padding: 1.5rem;
      border-radius: 15px;
      margin-top: 2rem;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
    }
    .totals-row.total {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin: 1rem -1.5rem -1.5rem;
      padding: 1rem 1.5rem;
      font-size: 1.5rem;
      font-weight: bold;
      border-radius: 0 0 15px 15px;
    }
    .footer {
      background: linear-gradient(135deg, #667eea05 0%, #764ba205 100%);
      padding: 1.5rem 2rem;
      margin-top: 2rem;
      border-top: 3px solid #667eea;
    }
    @media (max-width: 768px) {
      body { padding: 1rem; }
      .container { border-radius: 15px; }
      .header { padding: 1.5rem 1rem; }
      .company h1 { font-size: 1.5rem; }
      .doc-badge { font-size: 1rem; padding: 0.5rem 1rem; }
      .info-section { grid-template-columns: 1fr; gap: 1rem; }
      table { font-size: 0.75rem; }
      th, td { padding: 0.5rem 0.25rem; }
      .totals { width: 100%; padding: 1rem; }
      .totals-row { font-size: 0.875rem; }
      .totals-row.total { font-size: 1.125rem; padding: 0.75rem 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-content">
        <div class="company">
          <h1>✨ ${settings?.company_name || "Your Company"}</h1>
          <p>${settings?.company_address_line1 || ""}</p>
          <p>${settings?.company_email || ""} • ${settings?.company_phone || ""}</p>
        </div>
        <div class="doc-badge">${isInvoice ? "🧾 INVOICE" : "📝 ESTIMATE"} ${doc.doc_number}</div>
      </div>
    </div>

    <div class="body">
      <div class="info-section">
        <div class="info-card">
          <h3>👤 Bill To</h3>
          <p><strong>${client.business_name || client.full_name || "N/A"}</strong></p>
          ${client.address_line1 ? `<p>${client.address_line1}</p>` : ""}
          ${client.city ? `<p>${client.city}, ${client.state || ""}</p>` : ""}
          ${client.email ? `<p>📧 ${client.email}</p>` : ""}
        </div>
        <div class="info-card">
          <h3>📅 Document Info</h3>
          <p><strong>Issued:</strong> ${formatDate(doc.issue_date)}</p>
          ${doc.due_date ? `<p><strong>Due:</strong> ${formatDate(doc.due_date)}</p>` : ""}
          <p><strong>Status:</strong> ${doc.status.toUpperCase()}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Tax</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${doc.line_items
            .map(
              (item: any) => {
                const taxAmount = (item.quantity * item.unit_price * (item.tax_rate || 0)) / 100;
                const lineTotal = item.quantity * item.unit_price + taxAmount;
                return `
            <tr>
              <td><strong>${item.name || item.description}</strong></td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unit_price)}</td>
              <td>${item.tax_rate || 0}%</td>
              <td>${formatCurrency(lineTotal)}</td>
            </tr>
          `;
              }
            )
            .join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>Subtotal:</span><span>${formatCurrency(doc.subtotal)}</span></div>
        ${(doc.discount_amount ?? 0) > 0 ? `<div class="totals-row"><span>Discount:</span><span>-${formatCurrency(doc.discount_amount ?? 0)}</span></div>` : ""}
        ${(doc.tax_amount ?? 0) > 0 ? `<div class="totals-row"><span>Tax:</span><span>${formatCurrency(doc.tax_amount ?? 0)}</span></div>` : ""}
        <div class="totals-row total"><span>TOTAL</span><span>${formatCurrency(doc.total)}</span></div>
      </div>
    </div>

    ${doc.notes ? `<div class="footer"><strong>📝 Notes:</strong><br>${doc.notes}</div>` : ""}
  </div>
</body>
</html>
  `;
}

// ===== PROFESSIONAL TEMPLATE =====
function generateProfessionalTemplate(
  doc: InvoicingDocument,
  settings: InvoicingTenantSettings | null,
  isInvoice: boolean,
  client: any
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${isInvoice ? "Invoice" : "Estimate"} ${doc.doc_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #eceff1;
      padding: 2rem;
      color: #263238;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: #1e3a8a;
      color: white;
      padding: 2.5rem 2rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }
    .company h1 { font-size: 2rem; margin-bottom: 1rem; font-weight: 600; }
    .company p { margin: 0.25rem 0; opacity: 0.9; }
    .doc-info {
      text-align: right;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .doc-number {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .doc-type {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: inline-block;
    }
    .body { padding: 2rem; }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 2rem 0;
      padding: 1.5rem;
      background: #f5f5f5;
    }
    .info-box h3 {
      color: #1e3a8a;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .info-box p { margin: 0.25rem 0; color: #455a64; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
    }
    thead { background: #1e3a8a; color: white; }
    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    th:last-child, td:last-child { text-align: right; }
    td {
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
    }
    tbody tr:hover { background: #f5f5f5; }
    .totals {
      margin-left: auto;
      width: 350px;
      margin-top: 2rem;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: #f5f5f5;
      margin-bottom: 0.25rem;
    }
    .totals-row.total {
      background: #1e3a8a;
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 1rem;
    }
    .footer {
      background: #f5f5f5;
      padding: 1.5rem 2rem;
      margin-top: 2rem;
      border-top: 3px solid #1e3a8a;
    }
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .header { padding: 1.5rem 1rem; }
      .company h1 { font-size: 1.5rem; }
      .doc-number { font-size: 1.5rem; }
      .info-section { grid-template-columns: 1fr; gap: 1rem; }
      table { font-size: 0.75rem; }
      th, td { padding: 0.5rem 0.25rem; }
      th { font-size: 0.625rem; }
      .totals { width: 100%; }
      .totals-row { padding: 0.5rem; font-size: 0.875rem; }
      .totals-row.total { font-size: 1.125rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company">
        <h1>${settings?.company_name || "Your Company"}</h1>
        ${settings?.company_address_line1 ? `<p>${settings.company_address_line1}</p>` : ""}
        ${settings?.company_city ? `<p>${settings.company_city}, ${settings.company_state || ""} ${settings.company_postal_code || ""}</p>` : ""}
        ${settings?.company_email ? `<p>${settings.company_email}</p>` : ""}
        ${settings?.company_phone ? `<p>${settings.company_phone}</p>` : ""}
      </div>
      <div class="doc-info">
        <div class="doc-number">${doc.doc_number}</div>
        <div class="doc-type">${isInvoice ? "INVOICE" : "ESTIMATE"}</div>
      </div>
    </div>

    <div class="body">
      <div class="info-section">
        <div class="info-box">
          <h3>Bill To</h3>
          <p><strong>${client.business_name || client.full_name || "N/A"}</strong></p>
          ${client.address_line1 ? `<p>${client.address_line1}</p>` : ""}
          ${client.city ? `<p>${client.city}, ${client.state || ""} ${client.postal_code || ""}</p>` : ""}
          ${client.email ? `<p>${client.email}</p>` : ""}
          ${client.phone ? `<p>${client.phone}</p>` : ""}
        </div>
        <div class="info-box">
          <h3>Document Details</h3>
          <p>${formatDate(doc.issue_date)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Tax</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${doc.line_items
            .map(
              (item: any) => {
                const taxAmount = (item.quantity * item.unit_price * (item.tax_rate || 0)) / 100;
                const lineTotal = item.quantity * item.unit_price + taxAmount;
                return `
            <tr>
              <td><strong>${item.name || item.description}</strong></td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unit_price)}</td>
              <td>${item.tax_rate || 0}%</td>
              <td>${formatCurrency(lineTotal)}</td>
            </tr>
          `;
              }
            )
            .join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>Subtotal:</span><span>${formatCurrency(doc.subtotal)}</span></div>
        ${(doc.discount_amount ?? 0) > 0 ? `<div class="totals-row"><span>Discount:</span><span>-${formatCurrency(doc.discount_amount ?? 0)}</span></div>` : ""}
        ${(doc.tax_amount ?? 0) > 0 ? `<div class="totals-row"><span>Tax:</span><span>${formatCurrency(doc.tax_amount ?? 0)}</span></div>` : ""}
        <div class="totals-row total"><span>TOTAL:</span><span>${formatCurrency(doc.total)}</span></div>
      </div>
    </div>

    ${doc.notes ? `<div class="footer"><strong>Notes:</strong><br>${doc.notes}</div>` : ""}
  </div>
</body>
</html>
  `;
}
