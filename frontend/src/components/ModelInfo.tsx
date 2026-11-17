import { Chip } from '@heroui/react';
import { MouseEvent } from 'react';
import { ModelType } from 'src/api';
import { MODEL_TYPE_LABELS, wikiUrl } from 'src/lib/models';

export function ModelTypeBadge({ type }: { type: ModelType | null | undefined }) {
  if (!type) {
    return (
      <Chip size="sm" variant="soft" title="Not in the army index of the wiki">
        Other
      </Chip>
    );
  }

  return (
    <Chip size="sm" variant="secondary">
      {MODEL_TYPE_LABELS[type]}
    </Chip>
  );
}

export function WikiLink({ page }: { page: string | null | undefined }) {
  if (!page) {
    return null;
  }

  return (
    <a
      className="text-muted hover:text-accent text-xs"
      href={wikiUrl(page)}
      target="_blank"
      rel="noreferrer"
      title="Open in the Warmachine Academy wiki"
      onClick={(event: MouseEvent) => event.stopPropagation()}
    >
      wiki ↗
    </a>
  );
}
