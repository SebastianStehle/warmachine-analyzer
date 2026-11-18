import { Card } from '@heroui/react';
import { ReactNode, useEffect } from 'react';
import { texts } from 'src/texts';

export interface PageHeaderProps {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  image?: string | null;
}

export function PageHeader({ kicker, title, description, actions, image }: PageHeaderProps) {
  // Every page has a header, so it also names the browser tab.
  useEffect(() => {
    if (typeof title === 'string') {
      document.title = texts.common.pageTitle(title);
    }
  }, [title]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          {image && (
            <img src={image} alt="" className="border-border h-28 w-28 shrink-0 rounded-lg border object-cover object-top" />
          )}
          <div>
            {kicker && <div className="text-accent font-display text-sm tracking-widest uppercase">{kicker}</div>}
            <h1 className="text-4xl font-bold">{title}</h1>
            {description && <p className="text-muted mt-1 max-w-3xl text-sm">{description}</p>}
          </div>
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
    <Card className="gap-1">
      <div className="font-display text-muted text-xs tracking-widest uppercase">{label}</div>
      <div className="font-display text-3xl font-semibold">{value}</div>
      {detail && <div className="text-muted text-sm">{detail}</div>}
    </Card>
  );
}
