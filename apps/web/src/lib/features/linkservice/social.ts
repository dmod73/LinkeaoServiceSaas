import type { LucideIcon } from "lucide-react";
import {
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Mail,
  Phone,
  MessageCircle,
  Music2,
  Twitter,
  MapPin,
  CalendarClock
} from "lucide-react";

export type SocialOptionValue =
  | "website"
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "email"
  | "phone"
  | "whatsapp"
  | "tiktok"
  | "x"
  | "location"
  | "booking";

export type SocialOption = {
  value: SocialOptionValue;
  label: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
};

export type SocialLinksRecord = Partial<Record<SocialOptionValue, string>>;

export const SOCIAL_OPTIONS: SocialOption[] = [
  {
    value: "website",
    label: "Sitio web",
    description: "Tu dominio principal o landing page",
    icon: Globe,
    placeholder: "https://tu-dominio.com"
  },
  {
    value: "instagram",
    label: "Instagram",
    description: "Perfil oficial en Instagram",
    icon: Instagram,
    placeholder: "https://instagram.com/usuario"
  },
  {
    value: "facebook",
    label: "Facebook",
    description: "Pagina o grupo en Facebook",
    icon: Facebook,
    placeholder: "https://facebook.com/tu-pagina"
  },
  {
    value: "youtube",
    label: "YouTube",
    description: "Canal o video destacado",
    icon: Youtube,
    placeholder: "https://youtube.com/@canal"
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    description: "Pagina o perfil profesional",
    icon: Linkedin,
    placeholder: "https://linkedin.com/company/..."
  },
  {
    value: "email",
    label: "Email",
    description: "Correo de contacto directo",
    icon: Mail,
    placeholder: "mailto:hola@tu-negocio.com"
  },
  {
    value: "phone",
    label: "Telefono",
    description: "Numero directo o central telefonica",
    icon: Phone,
    placeholder: "tel:+18005551234"
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    description: "Chat directo via WhatsApp",
    icon: MessageCircle,
    placeholder: "https://wa.me/18095551234"
  },
  {
    value: "tiktok",
    label: "TikTok",
    description: "Perfil oficial en TikTok",
    icon: Music2,
    placeholder: "https://www.tiktok.com/@usuario"
  },
  {
    value: "x",
    label: "X / Twitter",
    description: "Cuenta oficial en X (Twitter)",
    icon: Twitter,
    placeholder: "https://x.com/usuario"
  },
  {
    value: "location",
    label: "Direccion",
    description: "Ubicacion fisica o mapa",
    icon: MapPin,
    placeholder: "https://maps.google.com/?q=Tu+Negocio"
  },
  {
    value: "booking",
    label: "Reservas",
    description: "Agenda o sistema de reservas",
    icon: CalendarClock,
    placeholder: "https://bookings.tu-negocio.com"
  }
];

export const SOCIAL_OPTION_MAP: Record<SocialOptionValue, SocialOption> = SOCIAL_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option;
    return acc;
  },
  {} as Record<SocialOptionValue, SocialOption>
);

export function getSocialOption(value: SocialOptionValue | string | null | undefined): SocialOption | null {
  if (!value) return null;
  return SOCIAL_OPTION_MAP[value as SocialOptionValue] ?? null;
}

export function normalizeSocialRecord(input: unknown): SocialLinksRecord {
  if (!input || typeof input !== "object") return {};
  const record = input as Record<string, unknown>;
  const result: SocialLinksRecord = {};
  for (const [key, value] of Object.entries(record)) {
    const option = getSocialOption(key);
    if (!option || typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    result[option.value] = trimmed;
  }
  return result;
}

export function serializeSocialRecord(record: SocialLinksRecord): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!value) continue;
    const option = getSocialOption(key);
    if (!option) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    output[option.value] = trimmed;
  }
  return output;
}
