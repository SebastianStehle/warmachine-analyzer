import { Logger } from '@nestjs/common';
import { WikiClient } from './client';
import { ArmyIndex, isArmyIndexTitle, parseArmyIndex, parseTemplateTitles } from './parsers';

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

  return result;
}
