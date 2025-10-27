import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServerSupabase } from "@/lib/supabase/server";
import { LinkServiceClient, type LinkKind, type LinkServiceProfile } from "./Client";
import { isModuleEnabled } from "@/lib/features/moduleAccess";
import { normalizeSocialRecord } from "@/lib/features/linkservice/social";

export const revalidate = 0;

export default async function LinkServicePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const canManageLinks = currentUser.role !== "member";

  if (!canManageLinks) {
    redirect("/dashboard");
  }

  if (!currentUser.tenantId) {
    redirect("/dashboard");
  }

  const moduleActive = await isModuleEnabled("linkservice");

  if (!moduleActive) {
    redirect("/dashboard/modules");
  }

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("link_service_profiles")
    .select(
      `
      id,
      tenant_id,
      handle,
      title,
      subtitle,
      avatar_url,
      social,
      theme,
      link_service_links (
        id,
        label,
        url,
        description,
        icon,
        kind,
        payload,
        thumbnail_url,
        position,
        is_active,
        highlight
      )
    `
    )
    .eq("tenant_id", currentUser.tenantId)
    .order("created_at", { ascending: true })
    .order("position", { ascending: true, foreignTable: "link_service_links" });

  if (error) {
    throw new Error(error.message);
  }

  const profiles: LinkServiceProfile[] = (data ?? []).map((profile) => ({
    id: profile.id,
    handle: profile.handle,
    title: profile.title,
    subtitle: profile.subtitle,
    avatarUrl: profile.avatar_url,
    social: normalizeSocialRecord(profile.social),
    theme: {
      background: profile.theme?.background ?? "#1f2937",
      accent: profile.theme?.accent ?? "#6366f1",
      textColor: profile.theme?.textColor ?? "#f8fafc",
      buttonShape: profile.theme?.buttonShape ?? "pill"
    },
    links: (profile.link_service_links ?? []).map((link: any) => ({
      id: link.id,
      label: link.label,
      url: link.url,
      description: link.description,
      icon: link.icon,
      thumbnailUrl: link.thumbnail_url ?? null,
      kind: (link.kind ?? "url") as LinkKind,
      payload: Array.isArray(link.payload) ? (link.payload as string[]) : [],
      position: link.position,
      isActive: link.is_active,
      highlight: link.highlight
    }))
  }));

  const canCreateProfile = canManageLinks;

  return (
    <LinkServiceClient
      profiles={profiles}
      canCreateProfile={canCreateProfile}
      canManageLinks={canManageLinks}
      isSystemAdmin={currentUser.role === "system_admin"}
    />
  );
}
