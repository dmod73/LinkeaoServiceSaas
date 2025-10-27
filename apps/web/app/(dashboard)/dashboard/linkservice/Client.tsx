"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./linkservice.module.css";
import { useToast } from "../../../components/ToastProvider";
import {
  SOCIAL_OPTIONS,
  getSocialOption,
  normalizeSocialRecord,
  serializeSocialRecord,
  type SocialLinksRecord,
  type SocialOptionValue
} from "@/lib/features/linkservice/social";
import type { LucideIcon } from "lucide-react";
import { Instagram, Facebook, MessageCircle, Images, Phone, MapPin, Link2, X } from "lucide-react";

type ButtonShape = "round" | "pill" | "square";

type Theme = {
  background: string;
  accent: string;
  textColor: string;
  buttonShape: ButtonShape;
};

export type LinkKind =
  | "url"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "carousel"
  | "phone"
  | "map";

type LinkItem = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  icon: string | null;
  thumbnailUrl: string | null;
  kind: LinkKind;
  payload: string[];
  position: number;
  isActive: boolean;
  highlight: boolean;
};

export type LinkServiceProfile = {
  id: string;
  handle: string;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  social: SocialLinksRecord;
  theme: Theme;
  links: LinkItem[];
};

type Props = {
  profiles: LinkServiceProfile[];
  canCreateProfile: boolean;
  canManageLinks: boolean;
  isSystemAdmin: boolean;
};

type ModalState =
  | { type: "profile"; mode: "create" | "edit"; profileId?: string }
  | { type: "delete-profile"; profileId: string }
  | { type: "link"; mode: "create" | "edit"; profileId: string; linkId?: string }
  | null;

type ProfileFormState = {
  title: string;
  handle: string;
  subtitle: string;
  avatarUrl: string;
  avatarPreview: string;
  avatarFile: File | null;
  background: string;
  accent: string;
  textColor: string;
  buttonShape: ButtonShape;
  social: SocialLinksRecord;
};

type CarouselMediaItem = {
  id: string;
  url: string;
  status: "existing" | "new";
  file?: File;
};

type LinkFormState = {
  label: string;
  kind: LinkKind;
  target: string;
  description: string;
  thumbnailUrl: string;
  thumbnailPreview: string | null;
  thumbnailFile: File | null;
  carouselMedia: CarouselMediaItem[];
  isActive: boolean;
  highlight: boolean;
};

const DEFAULT_THEME: Theme = {
  background: "#101927",
  accent: "#4f46e5",
  textColor: "#f8fafc",
  buttonShape: "pill"
};

const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#eef2ff"/><circle cx="48" cy="38" r="18" fill="#4f46e5"/><path d="M48 56c-18 0-32 12-32 24v4a48 48 0 0 0 64 0v-4c0-12-14-24-32-24z" fill="#c7d2fe"/><path d="M48 60c-16.2 0-28 10.5-28 18v2a40 40 0 0 0 56 0v-2c0-7.5-11.8-18-28-18z" fill="#4f46e5" opacity="0.2"/></svg>'
)}`;

const BUTTON_SHAPES: { value: ButtonShape; label: string }[] = [
  { value: "round", label: "Redondeado" },
  { value: "pill", label: "Pastilla" },
  { value: "square", label: "Cuadrado" }
];

type LinkKindOption = {
  value: LinkKind;
  label: string;
  description: string;
  placeholder?: string;
  icon: LucideIcon;
  requiresTarget: boolean;
  targetLabel: string;
  inputType?: "url" | "text" | "tel";
  format?: (value: string) => string;
};

const LINK_KIND_OPTIONS: LinkKindOption[] = [
  {
    value: "url",
    label: "Enlace",
    description: "Cualquier URL (blog, landing, formulario, etc.)",
    placeholder: "https://tu-enlace.com",
    icon: Link2,
    requiresTarget: true,
    targetLabel: "URL destino",
    inputType: "url",
    format: (value) => value.trim()
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    description: "Chat directo; escribe solo el numero",
    placeholder: "8095551234",
    icon: MessageCircle,
    requiresTarget: true,
    targetLabel: "NÃºmero de WhatsApp",
    inputType: "tel",
    format: (value) => {
      const trimmed = value.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const digits = trimmed.replace(/\D+/g, "");
      return digits.length ? `https://wa.me/${digits}` : trimmed;
    }
  },
  {
    value: "facebook",
    label: "Facebook",
    description: "Pagina o grupo oficial",
    placeholder: "https://facebook.com/tu-pagina",
    icon: Facebook,
    requiresTarget: true,
    targetLabel: "URL de Facebook",
    inputType: "url",
    format: (value) => value.trim()
  },
  {
    value: "instagram",
    label: "Instagram",
    description: "Perfil o Reel destacado",
    placeholder: "https://instagram.com/usuario",
    icon: Instagram,
    requiresTarget: true,
    targetLabel: "URL de Instagram",
    inputType: "url",
    format: (value) => value.trim()
  },
  {
    value: "phone",
    label: "Telefono",
    description: "Contacto directo (abrirÃ¡ la app telefÃ³nica)",
    placeholder: "8095551234",
    icon: Phone,
    requiresTarget: true,
    targetLabel: "NÃºmero de telÃ©fono",
    inputType: "tel",
    format: (value) => {
      const trimmed = value.trim();
      if (/^tel:/i.test(trimmed)) return trimmed.replace(/\s+/g, "");
      const digits = trimmed.replace(/\D+/g, "");
      if (!digits.length) return trimmed;
      const withPlus = `+${digits}`;
      return `tel:${withPlus}`;
    }
  },
  {
    value: "map",
    label: "Mapa",
    description: "DirecciÃ³n o enlace de Google Maps",
    placeholder: "Av. Winston Churchill, Santo Domingo",
    icon: MapPin,
    requiresTarget: true,
    targetLabel: "DirecciÃ³n o URL",
    inputType: "url",
    format: (value) => {
      const trimmed = value.trim();
      if (!trimmed) return trimmed;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const query = encodeURIComponent(trimmed);
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
  },
  {
    value: "carousel",
    label: "Carrusel de imagenes",
    description: "Presenta varias imagenes dentro del perfil",
    icon: Images,
    requiresTarget: false,
    targetLabel: "Imagenes (minimo una)"
  }
];

const DEFAULT_LINK_KIND: LinkKind = "url";

function getLinkKindOption(kind: LinkKind): LinkKindOption {
  return LINK_KIND_OPTIONS.find((option) => option.value === kind) ?? LINK_KIND_OPTIONS[0];
}

function formatLinkTarget(kind: LinkKind, value: string): string {
  const option = getLinkKindOption(kind);
  const formatted = option.format ? option.format(value) : value.trim();
  return formatted;
}

function createMediaId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `media-${Math.random().toString(36).slice(2, 10)}`;
}

function disposeCarouselPreviews(items: CarouselMediaItem[]) {
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
  items.forEach((item) => {
    if (item.status === "new" && item.url.startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
  });
}

type RGB = { r: number; g: number; b: number };

function parseHexColor(value: string | null | undefined): RGB | null {
  if (!value) return null;
  const hex = value.trim().toLowerCase();
  const match = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return null;
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split("")
      .map((part) => part + part)
      .join("");
  }
  const int = parseInt(digits, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function luminance({ r, g, b }: RGB): number {
  const srgb = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(a: RGB, b: RGB): number {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const brightest = Math.max(L1, L2);
  const darkest = Math.min(L1, L2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function getContrastingColor(color: string, fallbackDark = "#0f172a", fallbackLight = "#f8fafc"): string {
  const rgb = parseHexColor(color);
  if (!rgb) return fallbackDark;
  const lum = luminance(rgb);
  return lum > 0.55 ? fallbackDark : fallbackLight;
}

function ensureAccessibleColor(preferred: string | null | undefined, background: string): string {
  const bgRgb = parseHexColor(background);
  if (!bgRgb) {
    return preferred ?? getContrastingColor(background);
  }
  if (preferred) {
    const preferredRgb = parseHexColor(preferred);
    if (preferredRgb && contrastRatio(preferredRgb, bgRgb) >= 3) {
      return preferred;
    }
  }
  return getContrastingColor(background);
}

function withAlpha(color: string, alpha: number): string {
  const rgb = parseHexColor(color);
  if (!rgb) return `rgba(79, 70, 229, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function normalizeHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type CarouselProps = {
  images: string[];
  accent: string;
};

function CarouselPreview({ images, accent }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  useEffect(() => {
    setIndex(0);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [total]);

  if (!total) {
    return <div className={styles.previewCarouselPlaceholder}>Sin imagenes</div>;
  }

  const goPrev = () => setIndex((current) => (current === 0 ? total - 1 : current - 1));
  const goNext = () => setIndex((current) => (current + 1) % total);

  return (
    <div className={styles.previewCarouselContainer}>
      <div className={styles.previewCarouselViewport}>
        <img src={images[index]} alt="" className={styles.previewCarouselImage} />
        {total > 1 ? (
          <>
            <button type="button" className={`${styles.previewCarouselControl} ${styles.previewCarouselControlLeft}`} onClick={goPrev} aria-label="Imagen anterior">
              {"\u2039"}
            </button>
            <button type="button" className={`${styles.previewCarouselControl} ${styles.previewCarouselControlRight}`} onClick={goNext} aria-label="Imagen siguiente">
              {"\u203A"}
            </button>
          </>
        ) : null}
      </div>
      {total > 1 ? (
        <div className={styles.previewCarouselDots}>
          {images.map((_, dotIndex) => (
            <button
              key={`dot-${dotIndex}`}
              type="button"
              className={`${styles.previewCarouselDot} ${dotIndex === index ? styles.previewCarouselDotActive : ""}`.trim()}
              onClick={() => setIndex(dotIndex)}
              style={dotIndex === index ? { backgroundColor: accent } : undefined}
              aria-label={`Ir a la imagen ${dotIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type LinkCardProps = {
  link: LinkItem;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (payload: Partial<Pick<LinkItem, "isActive" | "highlight">>) => void;
};

function LinkCard({ link, busy, onEdit, onDelete, onToggle }: LinkCardProps) {
  const option = getLinkKindOption(link.kind ?? DEFAULT_LINK_KIND);
  const Icon = option.icon;
  const secondaryText =
    link.kind === "carousel" ? `${link.payload.length || 0} imagen${link.payload.length === 1 ? "" : "es"}` : link.url;

  return (
    <article className={styles.linkCard}>
      <div className={styles.linkMeta}>
        <div className={styles.linkThumb}>
          {link.thumbnailUrl ? (
            <img src={link.thumbnailUrl} alt="" />
          ) : (
            <span className={styles.linkThumbFallback} aria-hidden="true">
              <Icon size={18} />
            </span>
          )}
        </div>
        <div className={styles.linkInfo}>
          <strong>{link.label}</strong>
          <span>{secondaryText}</span>
        </div>
      </div>
      <div className={styles.linkControls}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={link.isActive}
            onChange={() => onToggle({ isActive: !link.isActive })}
            disabled={busy}
          />
          <span>Activo</span>
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={link.highlight}
            onChange={() => onToggle({ highlight: !link.highlight })}
            disabled={busy}
          />
          <span>Destacar</span>
        </label>
        <div className={styles.linkActions}>
          <button type="button" onClick={onEdit} className={styles.secondaryButton} disabled={busy}>
            Editar
          </button>
          <button type="button" onClick={onDelete} className={styles.dangerButton} disabled={busy}>
            Borrar
          </button>
        </div>
      </div>
    </article>
  );
}

export function LinkServiceClient({
  profiles: initialProfiles,
  canCreateProfile,
  canManageLinks,
  isSystemAdmin
}: Props) {
  const toast = useToast();

  const [profiles, setProfiles] = useState<LinkServiceProfile[]>(initialProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initialProfiles[0]?.id ?? null);
  const [modal, setModal] = useState<ModalState>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null);
  const [linkForm, setLinkForm] = useState<LinkFormState | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkBusyId, setLinkBusyId] = useState<string | null>(null);
  const [socialToAdd, setSocialToAdd] = useState<SocialOptionValue | "">("");

  const selectedProfile = useMemo(
    () => (selectedProfileId ? profiles.find((profile) => profile.id === selectedProfileId) ?? null : null),
    [profiles, selectedProfileId]
  );
  const publicProfileUrl = useMemo(() => {
    if (!selectedProfile?.handle) return null;
    return `/link/${selectedProfile.handle}`;
  }, [selectedProfile?.handle]);

  const socialEntries = useMemo(() => {
    if (!profileForm) return [];
    return SOCIAL_OPTIONS.filter((option) => Object.prototype.hasOwnProperty.call(profileForm.social, option.value));
  }, [profileForm]);

const availableSocialOptions = useMemo(() => {
  if (!profileForm) return SOCIAL_OPTIONS;
  return SOCIAL_OPTIONS.filter((option) => !Object.prototype.hasOwnProperty.call(profileForm.social, option.value));
}, [profileForm]);

  const activeLinkOption = linkForm ? getLinkKindOption(linkForm.kind) : null;

  const canAddMoreProfiles = isSystemAdmin || profiles.length === 0;
  const showCreateProfileButton = canCreateProfile && canAddMoreProfiles;

  const closeModal = () => {
    setModal(null);
    setProfileForm(null);
    setLinkForm(null);
    setLoading(false);
    setLinkBusyId(null);
  };

  const openProfileModal = (mode: "create" | "edit", profile?: LinkServiceProfile) => {
    setProfileForm(createProfileFormState(profile));
    setModal({ type: "profile", mode, profileId: profile?.id });
  };

  const openLinkModal = (mode: "create" | "edit", profile: LinkServiceProfile, link?: LinkItem) => {
    setLinkForm(createLinkFormState(link));
    setModal({ type: "link", mode, profileId: profile.id, linkId: link?.id });
  };

  const updateProfileInState = (profile: LinkServiceProfile) => {
    setProfiles((current) => {
      const exists = current.some((item) => item.id === profile.id);
      if (exists) {
        return current.map((item) => (item.id === profile.id ? profile : item));
      }
      return [...current, profile];
    });
  };

  const removeProfileFromState = (profileId: string) => {
    setProfiles((current) => current.filter((profile) => profile.id !== profileId));
  };

  const updateLinkInState = (profileId: string, link: LinkItem) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === profileId
          ? { ...profile, links: sortLinks(profile.links.map((item) => (item.id === link.id ? link : item))) }
          : profile
      )
    );
  };

  const addLinkToState = (profileId: string, link: LinkItem) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === profileId ? { ...profile, links: sortLinks([...profile.links, link]) } : profile
      )
    );
  };

  const removeLinkFromState = (profileId: string, linkId: string) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === profileId ? { ...profile, links: profile.links.filter((item) => item.id !== linkId) } : profile
      )
    );
  };

  const handleAddSocial = () => {
    if (!profileForm || !socialToAdd) return;
    setProfileForm((current) => {
      if (!current) return current;
      if (Object.prototype.hasOwnProperty.call(current.social, socialToAdd)) {
        return current;
      }
      return {
        ...current,
        social: { ...current.social, [socialToAdd]: "" }
      };
    });
    setSocialToAdd("");
  };

  const handleRemoveSocial = (value: SocialOptionValue) => {
    setProfileForm((current) => {
      if (!current) return current;
      if (!Object.prototype.hasOwnProperty.call(current.social, value)) {
        return current;
      }
      const nextSocial = { ...current.social };
      delete nextSocial[value];
      return { ...current, social: nextSocial };
    });
  };

  const handleCarouselMediaAdd = (fileList: FileList) => {
    if (!linkForm) return;
    const nextItems: CarouselMediaItem[] = Array.from(fileList).map((file) => ({
      id: createMediaId(),
      url:
        typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(file)
          : "",
      status: "new",
      file
    }));

    setLinkForm((current) => (current ? { ...current, carouselMedia: [...current.carouselMedia, ...nextItems] } : current));
  };

  const handleCarouselMediaRemove = (id: string) => {
    setLinkForm((current) => {
      if (!current) return current;
      const removed = current.carouselMedia.find((item) => item.id === id);
      if (
        removed &&
        removed.status === "new" &&
        removed.url.startsWith("blob:") &&
        typeof URL !== "undefined" &&
        typeof URL.revokeObjectURL === "function"
      ) {
        URL.revokeObjectURL(removed.url);
      }
      return {
        ...current,
        carouselMedia: current.carouselMedia.filter((item) => item.id !== id)
      };
    });
  };

  const handleCopyPublicUrl = async () => {
    if (!publicProfileUrl) return;
    const absolute =
      typeof window !== "undefined"
        ? new URL(publicProfileUrl, window.location.origin).toString()
        : publicProfileUrl;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(absolute);
        toast.success("URL publica copiada", { position: "top-right" });
      } else {
        throw new Error("Clipboard API no disponible");
      }
    } catch (error) {
      console.error("[linkservice] copy public url", error);
      toast.error("No pudimos copiar la URL", { position: "top-right" });
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileForm || !modal || modal.type !== "profile") return;

    const normalizedHandle = normalizeHandle(profileForm.handle);
    if (!profileForm.title.trim() || !normalizedHandle) {
      toast.error("Titulo y handle son requeridos", { position: "top-right" });
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = profileForm.avatarUrl.trim();
      if (profileForm.avatarFile) {
        avatarUrl = await uploadAsset(
          profileForm.avatarFile,
          "profile-avatar",
          modal.mode === "edit" ? modal.profileId : undefined
        );
      }

      const payload = {
        title: profileForm.title.trim(),
        handle: normalizedHandle,
        subtitle: profileForm.subtitle.trim(),
        avatarUrl: avatarUrl || null,
        social: serializeSocialRecord(profileForm.social),
        theme: {
          background: profileForm.background,
          accent: profileForm.accent,
          textColor: profileForm.textColor,
          buttonShape: profileForm.buttonShape
        }
      };

      const response =
        modal.mode === "create"
          ? await fetch("/api/linkservice/profiles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            })
          : await fetch(`/api/linkservice/profiles/${modal.profileId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No pudimos guardar el perfil");

      const profile: LinkServiceProfile = {
        id: data.profile.id,
        handle: data.profile.handle,
        title: data.profile.title,
        subtitle: data.profile.subtitle,
        avatarUrl: data.profile.avatar_url,
        social: normalizeSocialRecord(data.profile.social),
        theme: {
          background: data.profile.theme?.background ?? DEFAULT_THEME.background,
          accent: data.profile.theme?.accent ?? DEFAULT_THEME.accent,
          textColor: data.profile.theme?.textColor ?? DEFAULT_THEME.textColor,
          buttonShape: data.profile.theme?.buttonShape ?? DEFAULT_THEME.buttonShape
        },
        links: sortLinks(
          (data.profile.link_service_links ?? []).map((link: any) => ({
            id: link.id,
            label: link.label,
            url: link.url,
            description: link.description,
            icon: link.icon,
            thumbnailUrl: link.thumbnail_url ?? null,
            position: link.position,
            isActive: link.is_active,
            highlight: link.highlight
          }))
        )
      };

      updateProfileInState(profile);
      setSelectedProfileId(profile.id);

      toast.success(modal.mode === "create" ? "Perfil creado" : "Perfil actualizado", { position: "top-right" });
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar el perfil";
      toast.error(message, { position: "top-right" });
      setLoading(false);
    }
  };

  const handleProfileDelete = async () => {
    if (!modal || modal.type !== "delete-profile") return;
    setLoading(true);
    try {
      const response = await fetch(`/api/linkservice/profiles/${modal.profileId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No pudimos eliminar el perfil");

      removeProfileFromState(modal.profileId);
      setSelectedProfileId((current) => {
        if (current === modal.profileId) {
          const remaining = profiles.filter((profile) => profile.id !== modal.profileId);
          return remaining[0]?.id ?? null;
        }
        return current;
      });

      toast.success("Perfil eliminado", { position: "top-right" });
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al eliminar el perfil";
      toast.error(message, { position: "top-right" });
      setLoading(false);
    }
  };

  const handleLinkSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!modal || modal.type !== "link" || !selectedProfile || !linkForm) return;

    const label = linkForm.label.trim();
    if (!label) {
      toast.error("La etiqueta es requerida", { position: "top-right" });
      return;
    }

    const kindOption = getLinkKindOption(linkForm.kind);
    let target = linkForm.target.trim();

    if (kindOption.requiresTarget) {
      if (!target) {
        toast.error("Completa el destino para este enlace", { position: "top-right" });
        return;
      }
      target = formatLinkTarget(linkForm.kind, target);
    }

    if (linkForm.kind === "carousel" && linkForm.carouselMedia.length === 0) {
      toast.error("El carrusel necesita al menos una imagen", { position: "top-right" });
      return;
    }

    setLoading(true);
    try {
      let thumbnailUrl = linkForm.thumbnailUrl.trim();
      if (linkForm.thumbnailFile) {
        thumbnailUrl = await uploadAsset(linkForm.thumbnailFile, "link-thumbnail", selectedProfile.id);
      }

      let payload: string[] = [];
      let finalUrl = target || "#";

      if (linkForm.kind === "carousel") {
        const existing = linkForm.carouselMedia
          .filter((item) => item.status === "existing")
          .map((item) => item.url)
          .filter((url) => !!url);

        const uploaded: string[] = [];
        for (const item of linkForm.carouselMedia) {
          if (item.status === "new" && item.file) {
            const uploadedUrl = await uploadAsset(item.file, "link-carousel", selectedProfile.id);
            uploaded.push(uploadedUrl);
          }
        }

        payload = [...existing, ...uploaded];
        if (!payload.length) {
          throw new Error("No pudimos subir las imagenes del carrusel");
        }
        finalUrl = "#";
      } else {
        finalUrl = target;
        payload = [];
      }

      const basePayload = {
        label,
        url: finalUrl,
        description: linkForm.description.trim() || null,
        icon: linkForm.kind,
        thumbnailUrl: thumbnailUrl || null,
        kind: linkForm.kind,
        payload,
        isActive: linkForm.isActive,
        highlight: linkForm.highlight
      };

      const response =
        modal.mode === "create"
          ? await fetch("/api/linkservice/links", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...basePayload, profileId: selectedProfile.id })
            })
          : await fetch(`/api/linkservice/links/${modal.linkId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(basePayload)
            });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No pudimos guardar el link");

      const link: LinkItem = {
        id: data.link.id,
        label: data.link.label,
        url: data.link.url,
        description: data.link.description,
        icon: data.link.icon,
        thumbnailUrl: data.link.thumbnail_url ?? null,
        kind: (data.link.kind ?? "url") as LinkKind,
        payload: Array.isArray(data.link.payload) ? data.link.payload : [],
        position: data.link.position,
        isActive: data.link.is_active,
        highlight: data.link.highlight
      };

      if (modal.mode === "create") {
        addLinkToState(selectedProfile.id, link);
      } else {
        updateLinkInState(data.profileId ?? selectedProfile.id, link);
      }

      disposeCarouselPreviews(linkForm.carouselMedia.filter((item) => item.status === "new"));
      toast.success(modal.mode === "create" ? "Link creado" : "Link actualizado", { position: "top-right" });
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar el link";
      toast.error(message, { position: "top-right" });
      setLoading(false);
    }
  };

  const handleLinkDelete = async (profileId: string, linkId: string) => {
    setLinkBusyId(linkId);
    try {
      const response = await fetch(`/api/linkservice/links/${linkId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No pudimos eliminar el link");
      removeLinkFromState(data.profileId ?? profileId, linkId);
      toast.success("Link eliminado", { position: "top-right" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al eliminar el link";
      toast.error(message, { position: "top-right" });
    } finally {
      setLinkBusyId(null);
    }
  };

  const handleLinkToggle = async (
    profileId: string,
    linkId: string,
    changes: Partial<Pick<LinkItem, "isActive" | "highlight">>
  ) => {
    setLinkBusyId(linkId);
    try {
      const response = await fetch(`/api/linkservice/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No pudimos actualizar el link");

      const link: LinkItem = {
        id: data.link.id,
        label: data.link.label,
        url: data.link.url,
        description: data.link.description,
        icon: data.link.icon,
        thumbnailUrl: data.link.thumbnail_url ?? null,
        kind: (data.link.kind ?? "url") as LinkKind,
        payload: Array.isArray(data.link.payload) ? data.link.payload : [],
        position: data.link.position,
        isActive: data.link.is_active,
        highlight: data.link.highlight
      };

      updateLinkInState(data.profileId ?? profileId, link);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos actualizar el link";
      toast.error(message, { position: "top-right" });
    } finally {
      setLinkBusyId(null);
    }
  };

  return (
    <>
      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${profiles.length === 0 ? styles.sidebarEmpty : ""}`.trim()}>
          <header className={styles.sidebarHeader}>
            <div>
              <h1>LinkService</h1>
              <p>Crea tu bio estilo Linktree y conecta todas tus experiencias digitales.</p>
            </div>
            {showCreateProfileButton ? (
              <button type="button" className={styles.primaryButton} onClick={() => openProfileModal("create")}>
                Nuevo perfil
              </button>
            ) : null}
          </header>
          {!canAddMoreProfiles && !isSystemAdmin ? (
            <p className={styles.limitHint}>
              El plan actual permite un perfil. Contacta al system admin para ampliar la cuota.
            </p>
          ) : null}
          <ul className={styles.profileList}>
            {profiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`${styles.profileButton} ${selectedProfileId === profile.id ? styles.profileButtonActive : ""}`}
                >
                  <span className={styles.profileAvatar}>
                    <img src={resolveAvatar(profile.avatarUrl)} alt="" />
                  </span>
                  <span className={styles.profileText}>
                    <strong>{profile.title}</strong>
                    <small>@{profile.handle}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {profiles.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Sin perfiles todavia. Crea tu primer perfil para comenzar.</p>
              {canCreateProfile ? (
                <button type="button" className={styles.secondaryButton} onClick={() => openProfileModal("create")}>
                  Crear perfil
                </button>
              ) : null}
            </div>
          ) : null}
        </aside>

        <main className={styles.content}>
          {selectedProfile ? (
            <div className={styles.contentGrid}>
              <section className={styles.section}>
                <header className={styles.sectionHeader}>
                  <div>
                    <h2>{selectedProfile.title}</h2>
                    <p>Gestiona enlaces, colores y detalles principales.</p>
                  </div>
                  <div className={styles.sectionActions}>
                    {publicProfileUrl ? (
                      <>
                        <button type="button" className={styles.secondaryButton} onClick={handleCopyPublicUrl}>
                          Copiar link
                        </button>
                        <a
                          className={styles.secondaryButton}
                          href={publicProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver perfil
                        </a>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => openProfileModal("edit", selectedProfile)}
                    >
                      Editar perfil
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => openLinkModal("create", selectedProfile)}
                      disabled={!canManageLinks}
                    >
                      Nuevo link
                    </button>
                    {canManageLinks ? (
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => setModal({ type: "delete-profile", profileId: selectedProfile.id })}
                        disabled={loading}
                      >
                        Borrar perfil
                      </button>
                    ) : null}
                  </div>
                </header>

                <div className={styles.linksContainer}>
                  {selectedProfile.links.length ? (
                    selectedProfile.links.map((link) => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        busy={linkBusyId === link.id}
                        onEdit={() => openLinkModal("edit", selectedProfile, link)}
                        onDelete={() => handleLinkDelete(selectedProfile.id, link.id)}
                        onToggle={(changes) => handleLinkToggle(selectedProfile.id, link.id, changes)}
                      />
                    ))
                  ) : (
                    <div className={styles.emptyLinks}>
                      <p>Aun no tienes enlaces. Agrega tu primera accion destacada.</p>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => openLinkModal("create", selectedProfile)}
                        disabled={!canManageLinks}
                      >
                        Agregar link
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className={styles.previewSection}>
                <h3>Vista previa</h3>
                <p>Asi veran tu LinkService los visitantes. Ajusta estilos para reflejar tu marca.</p>
                <LinkPreview profile={selectedProfile} />
              </section>
            </div>
          ) : (
            <div className={styles.emptyContent}>
              <h2>Selecciona un perfil</h2>
              <p>Elige un perfil en la lista lateral para comenzar a editar.</p>
            </div>
          )}
        </main>
      </div>

      {modal?.type === "profile" && profileForm ? (
        <Modal title={modal.mode === "create" ? "Nuevo perfil" : "Editar perfil"} onClose={closeModal} wide>
          <form className={styles.form} onSubmit={handleProfileSubmit}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Titulo</span>
                <input
                  type="text"
                  value={profileForm.title}
                  onChange={(event) => setProfileForm((current) => (current ? { ...current, title: event.target.value } : current))}
                  placeholder="Nombre del perfil"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Handle</span>
                <input
                  type="text"
                  value={profileForm.handle}
                  onChange={(event) => setProfileForm((current) => (current ? { ...current, handle: event.target.value } : current))}
                  placeholder="ej. mi-negocio"
                  required
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Subtitulo</span>
              <input
                type="text"
                value={profileForm.subtitle}
                onChange={(event) => setProfileForm((current) => (current ? { ...current, subtitle: event.target.value } : current))}
                placeholder="Frase corta o slogan"
              />
            </label>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <span>Avatar</span>
                <div className={styles.fileInput}>
                  <label className={styles.fileLabel}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (!file) {
                          setProfileForm((current) =>
                            current
                              ? {
                                  ...current,
                                  avatarFile: null,
                                  avatarPreview: resolveAvatar(current.avatarUrl)
                                }
                              : current
                          );
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const preview = typeof reader.result === "string" ? reader.result : null;
                          setProfileForm((current) =>
                            current
                              ? {
                                  ...current,
                                  avatarFile: file,
                                  avatarPreview: preview ?? DEFAULT_AVATAR
                                }
                              : current
                          );
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <span>Subir imagen</span>
                  </label>
                  <div className={styles.avatarPreview}>
                    <img src={resolveAvatar(profileForm.avatarPreview)} alt="" />
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <span>Colores del tema</span>
                <div className={styles.colorRow}>
                  <label>
                    <span>Fondo</span>
                    <input
                      type="color"
                      value={profileForm.background}
                      onChange={(event) =>
                        setProfileForm((current) => (current ? { ...current, background: event.target.value } : current))
                      }
                    />
                  </label>
                  <label>
                    <span>Principal</span>
                    <input
                      type="color"
                      value={profileForm.accent}
                      onChange={(event) =>
                        setProfileForm((current) => (current ? { ...current, accent: event.target.value } : current))
                      }
                    />
                  </label>
                  <label>
                    <span>Texto</span>
                    <input
                      type="color"
                      value={profileForm.textColor}
                      onChange={(event) =>
                        setProfileForm((current) => (current ? { ...current, textColor: event.target.value } : current))
                      }
                    />
                  </label>
                </div>
                <label className={styles.field}>
                  <span>Forma de los botones</span>
                  <select
                    value={profileForm.buttonShape}
                    onChange={(event) =>
                      setProfileForm((current) =>
                        current ? { ...current, buttonShape: event.target.value as ButtonShape } : current
                      )
                    }
                  >
                    {BUTTON_SHAPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>Redes y contacto</legend>
              {socialEntries.length ? (
                <ul className={styles.socialList}>
                  {socialEntries.map((option) => {
                    const Icon = option.icon;
                    return (
                      <li key={option.value} className={styles.socialRow}>
                        <span className={styles.socialIcon}>
                          <Icon size={18} />
                        </span>
                        <div className={styles.socialContent}>
                          <div className={styles.socialLabel}>
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                          </div>
                          <input
                            type="url"
                            value={profileForm.social[option.value] ?? ""}
                            onChange={(event) =>
                              setProfileForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      social: { ...current.social, [option.value]: event.target.value }
                                    }
                                  : current
                              )
                            }
                            placeholder={option.placeholder}
                          />
                        </div>
                        <button
                          type="button"
                          className={styles.removeSocialButton}
                          onClick={() => handleRemoveSocial(option.value)}
                          aria-label={`Quitar ${option.label}`}
                        >
                          {"\u00d7"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.socialEmpty}>Agrega accesos a redes, contacto o reservas.</p>
              )}

              {availableSocialOptions.length ? (
                <div className={styles.socialAddRow}>
                  <select value={socialToAdd} onChange={(event) => setSocialToAdd(event.target.value as SocialOptionValue | "")}>
                    <option value="">Selecciona una opcion</option>
                    {availableSocialOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className={styles.secondaryButton} onClick={handleAddSocial} disabled={!socialToAdd}>
                    Anadir
                  </button>
                </div>
              ) : null}
            </fieldset>

            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeModal} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal?.type === "delete-profile" ? (
        <Modal title="Eliminar perfil" onClose={closeModal} variant="confirm">
          <p>Esta accion elimina el perfil y sus enlaces. Podras crear otro cuando lo necesites.</p>
          <div className={styles.formActions}>
            <button type="button" className={styles.secondaryButton} onClick={closeModal} disabled={loading}>
              Cancelar
            </button>
            <button type="button" className={styles.dangerButton} onClick={handleProfileDelete} disabled={loading}>
              {loading ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </Modal>
      ) : null}

      {modal?.type === "link" && linkForm && selectedProfile ? (
        <Modal title={modal.mode === "create" ? "Nuevo enlace" : "Editar enlace"} onClose={closeModal}>
          <form className={styles.form} onSubmit={handleLinkSubmit}>
            <label className={styles.field}>
              <span>Etiqueta</span>
              <input
                type="text"
                value={linkForm.label}
                onChange={(event) => setLinkForm((current) => (current ? { ...current, label: event.target.value } : current))}
                placeholder="Ej. Reserva ahora"
                required
              />
            </label>

            <div className={styles.field}>
              <span>Tipo de contenido</span>
              <select
                value={linkForm.kind}
                onChange={(event) => {
                  const nextKind = event.target.value as LinkKind;
                  setLinkForm((current) => {
                    if (!current) return current;
                    if (current.kind === nextKind) return current;
                    if (nextKind !== "carousel" && current.kind === "carousel") {
                      disposeCarouselPreviews(current.carouselMedia.filter((item) => item.status === "new"));
                    }
                    return {
                      ...current,
                      kind: nextKind,
                      target: nextKind === current.kind ? current.target : "",
                      carouselMedia: nextKind === "carousel" ? current.carouselMedia : []
                    };
                  });
                }}
              >
                {LINK_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {activeLinkOption ? <p className={styles.fieldHint}>{activeLinkOption.description}</p> : null}
            </div>

            {activeLinkOption?.requiresTarget ? (
              <label className={styles.field}>
                <span>{activeLinkOption.targetLabel}</span>
                <input
                  type={activeLinkOption.inputType ?? "text"}
                  value={linkForm.target}
                  onChange={(event) =>
                    setLinkForm((current) => (current ? { ...current, target: event.target.value } : current))
                  }
                  placeholder={activeLinkOption.placeholder}
                  required
                />
              </label>
            ) : null}

            {linkForm.kind === "carousel" ? (
              <div className={styles.field}>
                <span>{activeLinkOption?.targetLabel ?? "Imagenes"}</span>
                <div className={styles.carouselUploader}>
                  <label className={styles.fileLabel}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        const files = event.target.files;
                        if (files && files.length) {
                          handleCarouselMediaAdd(files);
                          event.target.value = "";
                        }
                      }}
                    />
                    <span>Agregar imagenes</span>
                  </label>
                  <div className={styles.carouselPreviewGrid}>
                    {linkForm.carouselMedia.length ? (
                      linkForm.carouselMedia.map((media) => (
                        <figure key={media.id} className={styles.carouselPreviewItem}>
                          {media.url ? <img src={media.url} alt="" /> : <span>Imagen</span>}
                          <button
                            type="button"
                            className={styles.carouselRemove}
                            onClick={() => handleCarouselMediaRemove(media.id)}
                            aria-label="Eliminar imagen"
                          >
                          <X size={16} aria-hidden="true" />
                          </button>
                        </figure>
                      ))
                    ) : (
                      <p className={styles.carouselEmpty}>Aun no hay imagenes en el carrusel.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <label className={styles.field}>
              <span>Descripcion</span>
              <textarea
                value={linkForm.description}
                onChange={(event) =>
                  setLinkForm((current) => (current ? { ...current, description: event.target.value } : current))
                }
                rows={3}
              />
            </label>

            <div className={styles.field}>
              <span>Miniatura</span>
              <div className={styles.fileInput}>
                <label className={styles.fileLabel}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (!file) {
                        setLinkForm((current) =>
                          current
                            ? {
                                ...current,
                                thumbnailFile: null,
                                thumbnailPreview: current.thumbnailUrl || null
                              }
                            : current
                        );
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const preview = typeof reader.result === "string" ? reader.result : null;
                        setLinkForm((current) =>
                          current
                            ? {
                                ...current,
                                thumbnailFile: file,
                                thumbnailPreview: preview
                              }
                            : current
                        );
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span>Subir imagen</span>
                </label>
                <div className={styles.thumbnailPreview}>
                  {linkForm.thumbnailPreview ? <img src={linkForm.thumbnailPreview} alt="" /> : <span>Sin imagen</span>}
                </div>
              </div>
            </div>

            <div className={styles.toggleGroup}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={linkForm.isActive}
                  onChange={(event) =>
                    setLinkForm((current) => (current ? { ...current, isActive: event.target.checked } : current))
                  }
                />
                <span>Mostrar en la bio</span>
              </label>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={linkForm.highlight}
                  onChange={(event) =>
                    setLinkForm((current) => (current ? { ...current, highlight: event.target.checked } : current))
                  }
                />
                <span>Resaltar con estilo principal</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeModal} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={loading}>
                {loading ? "Guardando..." : "Guardar link"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}


function sortLinks(links: LinkItem[]): LinkItem[] {
  return [...links].sort((a, b) => a.position - b.position);
}

function resolveAvatar(avatarUrl?: string | null): string {
  const value = avatarUrl?.trim();
  return value ? value : DEFAULT_AVATAR;
}

function createProfileFormState(profile?: LinkServiceProfile): ProfileFormState {
  const social: SocialLinksRecord = profile?.social ? { ...profile.social } : {};
  return {
    title: profile?.title ?? "",
    handle: profile?.handle ?? "",
    subtitle: profile?.subtitle ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    avatarPreview: resolveAvatar(profile?.avatarUrl),
    avatarFile: null,
    background: profile?.theme.background ?? DEFAULT_THEME.background,
    accent: profile?.theme.accent ?? DEFAULT_THEME.accent,
    textColor: profile?.theme.textColor ?? DEFAULT_THEME.textColor,
    buttonShape: profile?.theme.buttonShape ?? DEFAULT_THEME.buttonShape,
    social
  };
}

function createLinkFormState(link?: LinkItem): LinkFormState {
  const kind = link?.kind ?? DEFAULT_LINK_KIND;
  const carouselMedia: CarouselMediaItem[] =
    kind === "carousel" && Array.isArray(link?.payload)
      ? (link?.payload as string[]).map((url) => ({ id: createMediaId(), url, status: "existing" }))
      : [];

  return {
    label: link?.label ?? "",
    kind,
    target: kind === "carousel" ? "" : link?.url ?? "",
    description: link?.description ?? "",
    thumbnailUrl: link?.thumbnailUrl ?? "",
    thumbnailPreview: link?.thumbnailUrl ?? null,
    thumbnailFile: null,
    carouselMedia,
    isActive: link?.isActive ?? true,
    highlight: link?.highlight ?? false
  };
}

async function uploadAsset(file: File, scope: "profile-avatar" | "link-thumbnail" | "link-carousel", profileId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("scope", scope);
  if (profileId) formData.append("profileId", profileId);

  const response = await fetch("/api/linkservice/upload", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "No pudimos subir el archivo");
  }
  return data.url as string;
}

type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  variant?: "default" | "confirm";
};

function Modal({ title, onClose, children, wide, variant = "default" }: ModalProps) {
  if (variant === "confirm") {
    return (
      <div className={styles.modalOverlay} role="dialog" aria-modal="true">
        <div className={`${styles.modalConfirm} ${wide ? styles.modalWide : ""}`.trim()}>
          <button type="button" className={styles.confirmClose} onClick={onClose} aria-label="Cerrar">
            {"\u00d7"}
          </button>
          <div className={styles.confirmIcon}>!</div>
          <h2>{title}</h2>
          <div className={styles.modalBody}>{children}</div>
        </div>
      </div>
    );
  }

  const modalClass = [styles.modal, wide ? styles.modalWide : ""].filter(Boolean).join(" ");

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={modalClass}>
        <header className={styles.modalHeader}>
          <h2>{title}</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar">
            {"\u00d7"}
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

type PreviewProps = {
  profile: LinkServiceProfile;
};

function LinkPreview({ profile }: PreviewProps) {
  const background = profile.theme.background || DEFAULT_THEME.background;
  const accent = profile.theme.accent || DEFAULT_THEME.accent;
  const baseTextColor = profile.theme.textColor || DEFAULT_THEME.textColor;
  const textColor = ensureAccessibleColor(baseTextColor, background);
  const socialLinks = SOCIAL_OPTIONS.filter((option) => profile.social?.[option.value]);
  const buttonTextColor = parseHexColor(baseTextColor) ? baseTextColor : getContrastingColor(accent);
  const chipBackground = withAlpha(buttonTextColor, 0.16);
  const socialBackground = withAlpha(textColor, 0.12);

  const buttonShapeClass =
    profile.theme.buttonShape === "round"
      ? styles.previewButtonRound
      : profile.theme.buttonShape === "square"
      ? styles.previewButtonSquare
      : styles.previewButtonPill;

  return (
    <div className={styles.previewCard} style={{ backgroundColor: background, color: textColor }}>
      <div className={styles.previewHeader}>
        <div className={styles.previewAvatarWrapper} style={{ borderColor: accent }}>
          <img src={resolveAvatar(profile.avatarUrl)} alt={profile.title} />
        </div>
        <h3 style={{ color: textColor }}>{profile.title}</h3>
        {profile.subtitle ? <p style={{ color: textColor }}>{profile.subtitle}</p> : null}
        {socialLinks.length ? (
          <ul className={styles.previewSocial}>
            {socialLinks.map((option) => {
              const Icon = option.icon;
              return (
                <li key={option.value} className={styles.previewSocialItem}>
                  <span
                    className={styles.previewSocialButton}
                    style={{ backgroundColor: socialBackground, borderColor: accent, color: textColor }}
                    aria-label={option.label}
                    title={option.label}
                  >
                    <Icon size={18} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <ul className={styles.previewLinks}>
        {sortLinks(profile.links)
          .filter((link) => link.isActive)
          .map((link) => {
            const option = getLinkKindOption(link.kind ?? DEFAULT_LINK_KIND);
            const Icon = option.icon;

            if (link.kind === "carousel") {
              const images = Array.isArray(link.payload)
                ? (link.payload as string[]).filter(
                    (value): value is string => typeof value === "string" && value.length > 0
                  )
                : [];
              return (
                <li key={link.id}>
                  <div
                    className={`${styles.previewCarousel} ${buttonShapeClass}`}
                    style={{
                      borderColor: withAlpha(textColor, 0.25),
                      backgroundColor: withAlpha(textColor, 0.08),
                      color: textColor
                    }}
                  >
                    <header className={styles.previewCarouselHeader}>
                      <span className={styles.previewCarouselIcon}>
                        <Icon size={16} />
                      </span>
                      <span>{link.label}</span>
                    </header>
                    <CarouselPreview images={images} accent={accent} />
                  </div>
                </li>
              );
            }

            return (
              <li key={link.id}>
                <button
                  type="button"
                  className={`${styles.previewButton} ${buttonShapeClass} ${link.highlight ? styles.previewButtonHighlight : ""}`}
                  style={{ backgroundColor: accent, color: buttonTextColor }}
                >
                  <span
                    className={styles.previewThumb}
                    style={{ backgroundColor: link.thumbnailUrl ? undefined : chipBackground, color: buttonTextColor }}
                  >
                    {link.thumbnailUrl ? <img src={link.thumbnailUrl} alt="" /> : <Icon size={16} />}
                  </span>
                  <span className={styles.previewLabel}>{link.label}</span>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
































