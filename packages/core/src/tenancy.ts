export type TenantId = string;
export function assertTenant(id?: string): asserts id is TenantId {
  if (!id) {
    throw new Error("Tenant id is required");
  }
}
