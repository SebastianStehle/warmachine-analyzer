import { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { factionColor } from 'src/lib/factions';

// Links inside clickable table rows must not trigger the row click as well.
const stopPropagation = (event: MouseEvent) => event.stopPropagation();

const LINK_CLASS =
  'underline decoration-base-content/30 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary';

export interface ArmyLinkProps {
  army: string | null | undefined;
  faction?: string | null;
}

export function ArmyLink({ army, faction }: ArmyLinkProps) {
  if (!army) {
    return <span>–</span>;
  }

  return (
    <Link
      className="link link-hover inline-flex items-center gap-2 whitespace-nowrap"
      to={`/factions/${encodeURIComponent(army)}`}
      onClick={stopPropagation}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: factionColor(faction) }}
        title={faction ?? undefined}
      />
      {army}
    </Link>
  );
}

export interface EntityLinkProps {
  id: number | null | undefined;
  children: ReactNode;
}

export function PlayerLink({ id, children }: EntityLinkProps) {
  if (!id) {
    return <span>{children}</span>;
  }

  return (
    <Link className={LINK_CLASS} to={`/players/${id}`} onClick={stopPropagation}>
      {children}
    </Link>
  );
}

export function EventLink({ id, children }: EntityLinkProps) {
  if (!id) {
    return <span>{children}</span>;
  }

  return (
    <Link className={LINK_CLASS} to={`/events/${id}`} onClick={stopPropagation}>
      {children}
    </Link>
  );
}

export function ListLink({ id, children }: EntityLinkProps) {
  if (!id) {
    return <span>{children}</span>;
  }

  return (
    <Link className={LINK_CLASS} to={`/lists/${id}`} onClick={stopPropagation}>
      {children}
    </Link>
  );
}
