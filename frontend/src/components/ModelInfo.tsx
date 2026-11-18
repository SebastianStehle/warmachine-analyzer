import { Chip } from '@heroui/react';
import { MouseEvent } from 'react';
import { ModelType } from 'src/api';
import { MODEL_TYPE_LABELS, wikiUrl } from 'src/lib/models';
import { texts } from 'src/texts';

export function ModelTypeBadge({ type }: { type: ModelType | null | undefined }) {
  if (!type) {
    return (
      <Chip size="sm" variant="soft" title={texts.common.notInWiki}>
        {texts.common.other}
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
      title={texts.common.openInWiki}
      onClick={(event: MouseEvent) => event.stopPropagation()}
    >
      {texts.common.wiki}
    </a>
  );
}
