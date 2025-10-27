declare module "@core/shared" {
  export type Role = "system_admin" | "admin" | "member";
  export const Roles: { System: Role; Admin: Role; Member: Role };
  export type TenantId = string;
  export function assertTenant(id?: string): asserts id is TenantId;
}
