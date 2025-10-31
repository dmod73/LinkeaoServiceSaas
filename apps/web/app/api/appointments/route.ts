/**
 * @file Route handlers for appointments (alias for invoice module)
 * Re-exports invoice handlers with appointment naming for backwards compatibility
 * until DB migration is complete.
 */

import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// Note: this is a lightweight proxy route that forwards requests to /api/invoice/*.
// We intentionally avoid importing the generated Database type here to keep this shim
// file lightweight and not depend on a strict DB typings file.

// GET handler - list appointments
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Forward to invoice handler
  const invoiceRes = await fetch(`${request.nextUrl.origin}/api/invoice/appointments`, {
    method: "GET",
    headers: request.headers,
  });
  
  return invoiceRes;
}

// POST handler - create appointment
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Forward to invoice handler
  const invoiceRes = await fetch(`${request.nextUrl.origin}/api/invoice/appointments`, {
    method: "POST",
    headers: request.headers,
    body: await request.text()
  });
  
  return invoiceRes;
}

// PATCH handler - update appointment
export async function PATCH(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Forward to invoice handler
  const invoiceRes = await fetch(`${request.nextUrl.origin}/api/invoice/appointments`, {
    method: "PATCH",
    headers: request.headers,
    body: await request.text()
  });
  
  return invoiceRes;
}

// DELETE handler - cancel appointment
export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Forward to invoice handler
  const invoiceRes = await fetch(`${request.nextUrl.origin}/api/invoice/appointments`, {
    method: "DELETE",
    headers: request.headers
  });
  
  return invoiceRes;
}