/**
 * @file Public route handlers for appointments (alias for invoice module)
 * Re-exports invoice public handlers with appointment naming for backwards compatibility
 * until DB migration is complete.
 */

import type { NextRequest } from "next/server";

// GET handler - list public appointments
export async function GET(request: NextRequest) {
  // Forward to invoice handler
  const invoiceRes = await fetch(`${request.nextUrl.origin}/api/invoice/public/appointments`, {
    method: "GET",
    headers: request.headers,
  });
  
  return invoiceRes;
}

// POST handler - create public appointment
export async function POST(request: NextRequest) {
  // Forward to invoice handler
  const invoiceRes = await fetch(`${request.nextUrl.origin}/api/invoice/public/appointments`, {
    method: "POST",
    headers: request.headers,
    body: await request.text()
  });
  
  return invoiceRes;
}