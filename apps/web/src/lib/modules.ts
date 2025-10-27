export type ModuleKey = "linkservice" | string;

export type ModuleRecord = {
  id: ModuleKey;
  name: string;
  description: string;
  isFree: boolean;
};

export const MODULE_CATALOG: Record<ModuleKey, ModuleRecord> = {
  linkservice: {
    id: "linkservice",
    name: "LinkService",
    description: "Crea paginas de enlaces tipo Linktree con personalizacion y multiples enlaces.",
    isFree: true
  }
};

