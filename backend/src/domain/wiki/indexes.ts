import { Logger } from '@nestjs/common';
import { WikiClient } from './client';
import {
  ArmyIndex,
  Companion,
  isArmyIndexTitle,
  parseArmyIndex,
  parseAttachments,
  parseCompanions,
  parseEmbeddingPages,
  parseTemplateTitles,
} from './parsers';

const logger = new Logger('WikiIndexes');

export async function loadArmyIndexes(client: WikiClient) {
  const titles: string[] = [];

  let next: string | undefined;
  do {
    const page = parseTemplateTitles(await client.getTemplates(next));
    titles.push(...page.titles.filter(isArmyIndexTitle));
    next = page.next ?? undefined;
  } while (next);

  const result: ArmyIndex[] = [];
  for (const title of titles) {
    try {
      const index = parseArmyIndex(await client.getRenderedPage(title));
      if (index) {
        result.push(index);
      }
    } catch (error) {
      logger.warn(`Failed to load army index ${title}: ${error}`);
    }
  }

  await addAttachments(client, result);
  await addCompanions(client, result);
  return result;
}

async function addAttachments(client: WikiClient, indexes: ArmyIndex[]) {
  // Mercenary rows do not tell the type, so units are taken from all indexes before other armies get their attachments.
  const unitPages = new Set(
    indexes.flatMap(({ models }) => models.filter(({ type }) => type === 'unit').map(({ wikiPage }) => wikiPage)),
  );

  const attachments = new Map<string, string[]>();
  for (const { models } of indexes) {
    for (const unit of models.filter(({ wikiPage }) => wikiPage && unitPages.has(wikiPage))) {
      const page = unit.wikiPage!;
      if (!attachments.has(page)) {
        try {
          attachments.set(page, parseAttachments(await client.getSections(page), unit.name));
        } catch (error) {
          logger.warn(`Failed to load attachments of ${page}: ${error}`);
          attachments.set(page, []);
        }
      }

      for (const name of attachments.get(page)!) {
        if (!models.some((model) => model.name === name)) {
          models.push({ name, alias: null, wikiPage: page, type: 'attachment', isMercenary: unit.isMercenary });
        }
      }
    }
  }
}

const COMPANION_TEMPLATE = 'Template:Limited Battlegroup';

async function addCompanions(client: WikiClient, indexes: ArmyIndex[]) {
  const pages: string[] = [];

  let next: string | undefined;
  do {
    const page = parseEmbeddingPages(await client.getPagesUsingTemplate(COMPANION_TEMPLATE, next));
    pages.push(...page.titles);
    next = page.next ?? undefined;
  } while (next);

  for (const page of pages) {
    const owners = indexes.flatMap(({ models }) =>
      models.filter(({ wikiPage }) => wikiPage === page).map((owner) => ({ owner, models })),
    );
    if (owners.length === 0) {
      continue;
    }

    let companions: Companion[];
    try {
      companions = parseCompanions(await client.getWikitext(page));
    } catch (error) {
      logger.warn(`Failed to load companions of ${page}: ${error}`);
      continue;
    }

    for (const { owner, models } of owners) {
      for (const { name, type } of companions) {
        if (!models.some((model) => model.name === name)) {
          models.push({ name, alias: null, wikiPage: page, type, isMercenary: owner.isMercenary });
        }
      }
    }
  }
}
