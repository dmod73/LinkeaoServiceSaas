export type ModuleKey = 'linkservice' | 'appointments' | 'invoice' | string;

export type ModuleRecord = {
  id: ModuleKey;
  name: string;
  description: string;
  isFree: boolean;
};

export const MODULE_CATALOG: Record<ModuleKey, ModuleRecord> = {
  linkservice: {
    id: 'linkservice',
    name: 'LinkService',
    description: 'Crea paginas de enlaces tipo Linktree con personalizacion y multiples enlaces.',
    isFree: true
  },
  appointments: {
    id: 'appointments',
    name: 'Appointments',
    description: 'Agenda inteligente con reservas, disponibilidad y reportes para tu negocio.',
    isFree: false
  },
  // Mantener invoice como alias por compatibilidad
  invoice: {
    id: 'invoice',
    name: 'Appointments',
    description: 'Agenda inteligente con reservas, disponibilidad y reportes para tu negocio.',
    isFree: false
  }
};

