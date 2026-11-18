import { ModelType } from 'src/api';
import { texts } from 'src/texts';

export const MODEL_TYPE_LABELS: Record<ModelType, string> = texts.common.modelTypes;

const WIKI_URL = 'https://warmachineacademy.miraheze.org/wiki/';

export const wikiUrl = (page: string) => `${WIKI_URL}${encodeURIComponent(page.replace(/ /g, '_'))}`;
