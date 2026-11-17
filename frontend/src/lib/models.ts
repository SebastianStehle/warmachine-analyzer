import { ModelType } from 'src/api';

export const MODEL_TYPE_LABELS: Record<ModelType, string> = {
  leader: 'Leader',
  warjack: 'Warjack',
  warbeast: 'Warbeast',
  'battle-engine': 'Battle engine',
  solo: 'Solo',
  unit: 'Unit',
  attachment: 'Attachment',
  structure: 'Structure',
};

const WIKI_URL = 'https://warmachineacademy.miraheze.org/wiki/';

export const wikiUrl = (page: string) => `${WIKI_URL}${encodeURIComponent(page.replace(/ /g, '_'))}`;
