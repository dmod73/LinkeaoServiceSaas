import * as React from "react";

export type CardProps = React.PropsWithChildren<{ className?: string }>;

export const Card: React.FC<CardProps> = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`.trim()}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="space-y-1">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
  </div>
);
