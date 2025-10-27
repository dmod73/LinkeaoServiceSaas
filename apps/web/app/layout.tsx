import "../src/styles/globals.css";
import { ToastProvider } from "./components/ToastProvider";
import type { ReactNode } from "react";

export const metadata = { title: "MicroSaaS", description: "Multi-tenant base" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

