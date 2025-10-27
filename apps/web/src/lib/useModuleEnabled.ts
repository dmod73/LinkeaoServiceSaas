"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";

async function fetcher(moduleId: string) {
  const response = await fetch(`/api/modules/${moduleId}/status`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No pudimos obtener el estado del modulo");
  }
  const payload = await response.json();
  return Boolean(payload?.enabled);
}

export function useModuleEnabled(moduleId: string, initialValue?: boolean) {
  const [enabled, setEnabled] = useState(initialValue ?? false);

  const { data } = useSWR(moduleId, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    fallbackData: initialValue
  });

  useEffect(() => {
    if (typeof data === "boolean") {
      setEnabled(data);
    }
  }, [data]);

  return enabled;
}

