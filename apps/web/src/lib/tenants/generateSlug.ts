import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function generateTenantSlug(
  service: SupabaseClient,
  email: string | null,
  fallbackId: string
): Promise<string> {
  const baseRaw = (email ?? fallbackId).split("@")[0] ?? fallbackId;
  const sanitizedBase = baseRaw.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") || "tenant";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? sanitizedBase : `${sanitizedBase}-${randomUUID().slice(0, 8)}`;
    const { data, error } = await service.from("tenants").select("id").eq("id", candidate).maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return candidate;
    }
  }

  return `${sanitizedBase}-${Date.now().toString(36)}`;
}

