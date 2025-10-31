/**
 * @file Public settings route handler for appointments (alias for invoice module)
 * Re-exports invoice public handlers with appointment naming for backwards compatibility
 * until DB migration is complete.
 */

import type { NextRequest } from "next/server";

// GET handler - get public settings
export async function GET(request: NextRequest) {
  // Forward to invoice handler
  const invoiceRes = await fetch(`${request.nextUrl.origin}/api/invoice/public/settings`, {
    method: "GET",
    headers: request.headers,
  });
  
  return invoiceRes;
}