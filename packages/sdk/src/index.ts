import type { TenantId } from "@core/shared";

export const api = {
  ping(tenant: TenantId) {
    return { ok: true, tenant };
  }
};
