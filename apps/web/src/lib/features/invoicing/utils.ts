// =====================================================
// INVOICING MODULE - Utilities
// =====================================================

import type { DocumentLineItem, DiscountType, InvoicingDocument, DocumentStatus } from './types';

/**
 * Calculate line item total before tax
 */
export function calculateLineItemSubtotal(item: DocumentLineItem): number {
  const subtotal = item.quantity * item.unit_price;
  const discount = item.discount || 0;
  return subtotal - discount;
}

/**
 * Calculate line item tax
 */
export function calculateLineItemTax(item: DocumentLineItem): number {
  const subtotal = calculateLineItemSubtotal(item);
  return subtotal * (item.tax_rate / 100);
}

/**
 * Calculate line item total (subtotal + tax)
 */
export function calculateLineItemTotal(item: DocumentLineItem): number {
  const subtotal = calculateLineItemSubtotal(item);
  const tax = calculateLineItemTax(item);
  return subtotal + tax;
}

/**
 * Calculate document subtotal (sum of all line items before discount and tax)
 */
export function calculateDocumentSubtotal(items: DocumentLineItem[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price);
  }, 0);
}

/**
 * Calculate document discount amount
 */
export function calculateDiscountAmount(
  subtotal: number,
  discountType?: DiscountType,
  discountValue?: number
): number {
  if (!discountType || !discountValue) return 0;
  
  if (discountType === 'percentage') {
    return subtotal * (discountValue / 100);
  }
  
  return discountValue;
}

/**
 * Calculate document tax total
 */
export function calculateDocumentTax(
  items: DocumentLineItem[],
  subtotal: number,
  discountAmount: number
): number {
  if (subtotal === 0) return 0;
  
  return items.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price;
    // Apply proportional discount to this line
    const lineAfterDiscount = lineSubtotal - (lineSubtotal * (discountAmount / subtotal));
    const lineTax = lineAfterDiscount * (item.tax_rate / 100);
    return sum + lineTax;
  }, 0);
}

/**
 * Calculate document total
 */
export function calculateDocumentTotal(
  items: DocumentLineItem[],
  discountType?: DiscountType,
  discountValue?: number
): {
  subtotal: number;
  discountAmount: number;
  taxTotal: number;
  total: number;
} {
  const subtotal = calculateDocumentSubtotal(items);
  const discountAmount = calculateDiscountAmount(subtotal, discountType, discountValue);
  const taxTotal = calculateDocumentTax(items, subtotal, discountAmount);
  const total = subtotal - discountAmount + taxTotal;
  
  return {
    subtotal: roundToTwo(subtotal),
    discountAmount: roundToTwo(discountAmount),
    taxTotal: roundToTwo(taxTotal),
    total: roundToTwo(total),
  };
}

/**
 * Round to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(dateString: string): string {
  // Parse the date string and add time to avoid timezone issues
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format short date
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Get status color
 */
export function getStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    draft: '#6b7280',
    sent: '#3b82f6',
    viewed: '#8b5cf6',
    paid: '#10b981',
    partial: '#f59e0b',
    overdue: '#ef4444',
    cancelled: '#ef4444',
    accepted: '#10b981',
    declined: '#ef4444',
  };
  
  return colors[status] || '#6b7280';
}

/**
 * Get status label in Spanish
 */
export function getStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    draft: 'Borrador',
    sent: 'Enviado',
    viewed: 'Visto',
    paid: 'Pagado',
    partial: 'Parcial',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
    accepted: 'Aceptado',
    declined: 'Rechazado',
  };
  
  return labels[status] || status;
}

/**
 * Check if invoice is overdue
 */
export function isOverdue(doc: InvoicingDocument): boolean {
  if (doc.status === 'paid' || doc.status === 'cancelled') return false;
  if (!doc.due_date) return false;
  
  const dueDate = new Date(doc.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}

/**
 * Generate next document number
 */
export function generateDocumentNumber(
  prefix: string,
  nextNumber: number,
  padLength: number = 4
): string {
  const paddedNumber = nextNumber.toString().padStart(padLength, '0');
  return `${prefix}-${paddedNumber}`;
}

/**
 * Calculate balance due
 */
export function calculateBalanceDue(doc: InvoicingDocument): number {
  return roundToTwo(doc.total - doc.amount_paid);
}

/**
 * Get payment status badge info
 */
export function getPaymentStatusBadge(doc: InvoicingDocument): {
  label: string;
  color: string;
} {
  const balance = calculateBalanceDue(doc);
  
  if (balance === 0) {
    return { label: 'Pagado', color: '#10b981' };
  }
  
  if (doc.amount_paid > 0) {
    return { label: 'Parcial', color: '#f59e0b' };
  }
  
  if (isOverdue(doc)) {
    return { label: 'Vencido', color: '#ef4444' };
  }
  
  return { label: 'Pendiente', color: '#6b7280' };
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate PDF filename
 */
export function generatePDFFilename(
  docType: 'invoice' | 'estimate',
  docNumber: string,
  clientName?: string
): string {
  const type = docType === 'invoice' ? 'Factura' : 'Estimado';
  const client = clientName ? `-${clientName.replace(/\s+/g, '-')}` : '';
  return `${type}-${docNumber}${client}.pdf`;
}
