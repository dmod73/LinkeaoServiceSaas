"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import styles from "./ToastProvider.module.css";

type ToastType = "info" | "success" | "error";

type ToastPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  position: ToastPosition;
};

type ToastOptions = {
  type?: ToastType;
  position?: ToastPosition;
  durationMs?: number;
};

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: Omit<ToastOptions, "type">) => void;
  error: (message: string, options?: Omit<ToastOptions, "type">) => void;
  info: (message: string, options?: Omit<ToastOptions, "type">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function warnMissingProvider() {
  if (process.env.NODE_ENV !== "production") {
    console.warn("useToast se llamo sin un ToastProvider en el arbol. Envuelve tu layout con <ToastProvider>.");
  }
}

const noopContext: ToastContextValue = {
  show: (_message: string, _options?: ToastOptions) => warnMissingProvider(),
  success: (_message: string, _options?: Omit<ToastOptions, "type">) => warnMissingProvider(),
  error: (_message: string, _options?: Omit<ToastOptions, "type">) => warnMissingProvider(),
  info: (_message: string, _options?: Omit<ToastOptions, "type">) => warnMissingProvider()
};
const DEFAULT_DURATION = 5000;
const DEFAULT_POSITION: ToastPosition = "bottom-right";
const POSITIONS: ToastPosition[] = ["top-right", "top-left", "bottom-right", "bottom-left"];

function createId() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = createId();
      const type = options?.type ?? "info";
      const position = options?.position ?? DEFAULT_POSITION;
      const duration = options?.durationMs ?? DEFAULT_DURATION;

      setToasts((current) => [...current, { id, message, type, position }]);
      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const success = useCallback(
    (message: string, options?: Omit<ToastOptions, "type">) => show(message, { ...options, type: "success" }),
    [show]
  );

  const error = useCallback(
    (message: string, options?: Omit<ToastOptions, "type">) => show(message, { ...options, type: "error" }),
    [show]
  );

  const info = useCallback(
    (message: string, options?: Omit<ToastOptions, "type">) => show(message, { ...options, type: "info" }),
    [show]
  );

  const value = useMemo<ToastContextValue>(() => ({ show, success, error, info }), [show, success, error, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport}>
        {POSITIONS.map((position) => {
          const stack = toasts.filter((toast) => toast.position === position);
          if (!stack.length) return null;
          return (
            <div key={position} className={`${styles.stack} ${styles[position]}`.trim()}>
              {stack.map((toast) => (
                <button
                  key={toast.id}
                  type="button"
                  className={`${styles.toast} ${styles[toast.type]}`.trim()}
                  onClick={() => remove(toast.id)}
                >
                  {toast.message}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? noopContext;
}
