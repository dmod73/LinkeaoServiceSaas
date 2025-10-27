export type VercelSyncResult = {
  synced: boolean;
  reason?: string;
};

export async function syncTenantSlugToVercel(
  previousSlug: string,
  newSlug: string
): Promise<VercelSyncResult> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    console.info("[vercel-sync] skipped (missing config)", { previousSlug, newSlug });
    return { synced: false, reason: "missing_config" };
  }

  console.info("[vercel-sync] ready to sync", { previousSlug, newSlug, projectId });
  // TODO: integrar con Vercel Domains API cuando se habilite el despliegue remoto.
  return { synced: false, reason: "not_implemented" };
}
