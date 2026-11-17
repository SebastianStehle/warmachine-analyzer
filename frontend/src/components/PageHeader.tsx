import { ReactNode } from 'react';

export interface PageHeaderProps {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ kicker, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {kicker && <div className="text-primary font-display text-sm tracking-widest uppercase">{kicker}</div>}
          <h1 className="text-4xl font-bold">{title}</h1>
          {description && <p className="text-base-content/80 mt-1 max-w-3xl text-sm">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="brass-rule w-40" />
    </div>
  );
}

export interface StatTileProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <div className="panel flex flex-col gap-1 px-5 py-4">
      <div className="font-display text-base-content/80 text-xs tracking-widest uppercase">{label}</div>
      <div className="font-display text-3xl font-semibold">{value}</div>
      {detail && <div className="text-base-content/80 text-sm">{detail}</div>}
    </div>
  );
}
