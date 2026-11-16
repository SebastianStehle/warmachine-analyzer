import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PageEntity, PageRepository } from 'src/domain/database';
import { LongshanksConfig } from './config';

const USER_AGENT = 'warmachine-analyzer (+https://github.com/SebastianStehle)';

@Injectable()
export class LongshanksClient {
  private readonly logger = new Logger(LongshanksClient.name);
  private readonly config: LongshanksConfig;
  private lastRequest = 0;

  constructor(
    @InjectRepository(PageEntity)
    private readonly pages: PageRepository,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<LongshanksConfig>('longshanks');
  }

  // Raw pages are stored, so a parser fix can re-import finished events without downloading them again.
  async get(path: string, useCache: boolean) {
    const url = new URL(path, this.config.baseUrl).toString();

    if (useCache) {
      const cached = await this.pages.findOneBy({ url });
      if (cached) {
        return cached.body;
      }
    }

    await this.waitForTurn();

    this.logger.log(`Downloading ${url}`);
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`Failed to download ${url}, got ${response.status}.`);
    }

    const body = await response.text();
    await this.pages.save({ url, body });

    return body;
  }

  private async waitForTurn() {
    const wait = this.lastRequest + this.config.requestDelayMs - Date.now();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }

    this.lastRequest = Date.now();
  }
}
