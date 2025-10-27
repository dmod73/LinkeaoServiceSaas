import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import styles from "./page.module.css";
import { getServiceSupabase } from "@/lib/supabase/service";
import { SOCIAL_OPTIONS, type SocialOption, normalizeSocialRecord } from "@/lib/features/linkservice/social";
import { Link2, MessageCircle, Facebook, Instagram, Images, Phone, MapPin } from "lucide-react";
import Carousel from "./Carousel";

type LinkRow = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  icon: string | null;
  kind: string | null;
  payload: unknown;
  thumbnail_url: string | null;
  position: number;
  is_active: boolean;
  highlight: boolean;
};

type ProfileRow = {
  handle: string;
  title: string;
  subtitle: string | null;
  avatar_url: string | null;
  social: Record<string, string> | null;
  theme: {
    background?: string;
    cardBackground?: string;
    accent?: string;
    textColor?: string;
    buttonShape?: "round" | "pill" | "square";
  } | null;
  link_service_links: LinkRow[] | null;
};

export const revalidate = 0;

type LinkKind = "url" | "whatsapp" | "facebook" | "instagram" | "carousel" | "phone" | "map";

const LINK_KIND_ICONS: Record<LinkKind, ComponentType<{ size?: number }>> = {
  url: Link2,
  whatsapp: MessageCircle,
  facebook: Facebook,
  instagram: Instagram,
  carousel: Images,
  phone: Phone,
  map: MapPin
};

type NormalizedLink = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  kind: LinkKind;
  payload: string[];
  thumbnailUrl: string | null;
  highlight: boolean;
};

function getKind(raw: string | null | undefined): LinkKind {
  switch (raw) {
    case "whatsapp":
    case "facebook":
    case "instagram":
    case "carousel":
    case "phone":
    case "map":
      return raw;
    default:
      return "url";
  }
}

function pickColor(value: string | null | undefined, fallback: string): string {
  return value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;
}

const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#eef2ff"/><circle cx="48" cy="38" r="18" fill="#4f46e5"/><path d="M48 56c-18 0-32 12-32 24v4a48 48 0 0 0 64 0v-4c0-12-14-24-32-24z" fill="#c7d2fe"/><path d="M48 60c-16.2 0-28 10.5-28 18v2a40 40 0 0 0 56 0v-2c0-7.5-11.8-18-28-18z" fill="#4f46e5" opacity="0.2"/></svg>'
)} `;

function getAvatar(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : DEFAULT_AVATAR;
}

type RouteParams = { params: Promise<{ handle: string }> };

type SocialLink = { option: SocialOption; href: string };

function mapSocialLinks(social: Record<string, string> | null | undefined): SocialLink[] {
  const normalized = normalizeSocialRecord(social);
  const result: SocialLink[] = [];
  for (const option of SOCIAL_OPTIONS) {
    const href = normalized[option.value];
    if (!href) continue;
    result.push({ option, href });
  }
  return result;
}

export default async function PublicLinkServicePage({ params }: RouteParams) {
  const { handle } = await params;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("link_service_profiles")
    .select(
      "handle, title, subtitle, avatar_url, social, theme, link_service_links(id, label, url, description, icon, kind, payload, thumbnail_url, position, is_active, highlight)"
    )
    .eq("handle", handle)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error("[linkservice-public] fetch", error);
    throw new Error("No pudimos cargar este perfil");
  }

  if (!data) {
    notFound();
  }

  const background = pickColor(data.theme?.background, "#0f172a");
  const accent = pickColor(data.theme?.accent, "#6366f1");
  const textColor = pickColor(data.theme?.textColor, "#f8fafc");
  const cardBackground = pickColor(data.theme?.cardBackground ?? data.theme?.background, background);
  const buttonShape = data.theme?.buttonShape ?? "pill";
  const socialLinks = mapSocialLinks(data.social);

  const normalizePayload = (value: unknown): string[] =>
    Array.isArray(value)
      ? (value as unknown[])
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => !!entry)
      : [];

  const formattedLinks: NormalizedLink[] = (data.link_service_links ?? [])
    .filter((link) => link.is_active)
    .sort((a, b) => a.position - b.position)
    .map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url ?? "",
      description: link.description,
      kind: getKind(link.kind),
      payload: normalizePayload(link.payload),
      thumbnailUrl: link.thumbnail_url,
      highlight: link.highlight
    }));

  return (
    <div className={styles.page} style={{ backgroundColor: background }}>
      <div className={styles.overlay}>
        <article
          className={styles.card}
          style={{
            color: textColor,
            backgroundColor: cardBackground,
            boxShadow: cardBackground === background ? "none" : "0 24px 48px rgba(15, 23, 42, 0.45)"
          }}
        >
          <header className={styles.header}>
            <div className={styles.avatarBorder} style={{ borderColor: accent }}>
              <img src={getAvatar(data.avatar_url)} alt={data.title} />
            </div>
            <h1>{data.title}</h1>
            {data.subtitle ? <p>{data.subtitle}</p> : null}
            {socialLinks.length ? (
              <nav className={styles.socialBar} aria-label="Redes y contacto">
                {socialLinks.map(({ option, href }) => {
                  const Icon = option.icon;
                  return (
                    <a
                      key={option.value}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      style={{ borderColor: accent }}
                      aria-label={option.label}
                    >
                      <Icon size={18} />
                    </a>
                  );
                })}
              </nav>
            ) : null}
          </header>
          <section className={styles.links}>
            {formattedLinks.map((link) => {
              const Icon = LINK_KIND_ICONS[link.kind];

              if (link.kind === "carousel") {
                const images = link.payload.length ? link.payload : [link.url].filter(Boolean);
                return (
                  <article key={link.id} className={styles.carouselCard} style={{ borderColor: accent }}>
                    <header className={styles.carouselHeader}>
                      <span className={styles.carouselIcon} style={{ borderColor: accent }}>
                        <Icon size={18} />
                      </span>
                      <div className={styles.carouselHeaderContent}>
                        <span>{link.label}</span>
                        {link.description ? <small>{link.description}</small> : null}
                      </div>
                    </header>
                    <Carousel images={images} accent={accent} />
                  </article>
                );
              }

              const showThumb = !!link.thumbnailUrl;
              const highlightClass = link.highlight ? ` ${styles.linkButtonHighlight}` : "";

              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.linkButton} ${styles[`linkButton_${buttonShape}`]}${highlightClass}`}
                  style={{
                    backgroundColor: accent,
                    color: textColor
                  }}
                >
                  {showThumb ? (
                    <span className={styles.linkThumb}>
                      <img src={link.thumbnailUrl!} alt="" />
                    </span>
                  ) : (
                    <span className={styles.linkIcon}>
                      <Icon size={18} />
                    </span>
                  )}
                  <span className={styles.linkLabel}>{link.label}</span>
                </a>
              );
            })}
            {!formattedLinks.length ? (
              <p className={styles.emptyLinks}>Este perfil aún no tiene enlaces publicados.</p>
            ) : null}
          </section>
        </article>
      </div>
    </div>
  );
}
