import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PageEntity, PageRepository } from 'src/domain/database';
import { LongshanksConfig } from './config';
import { RequestThrottle } from './throttle';

const USER_AGENT = 'warmachine-analyzer (+https://github.com/SebastianStehle)';

@Injectable()
export class LongshanksClient {
  private readonly logger = new Logger(LongshanksClient.name);
  private readonly config: LongshanksConfig;
  private readonly throttle: RequestThrottle;

  constructor(
    @InjectRepository(PageEntity)
    private readonly pages: PageRepository,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<LongshanksConfig>('longshanks');
    this.throttle = new RequestThrottle(this.config.maxConcurrentRequests, this.config.requestDelayMs);
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

    const body = await this.throttle.run(async () => {
      this.logger.log(`Downloading ${url}`);

      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!response.ok) {
        throw new Error(`Failed to download ${url}, got ${response.status}.`);
      }

      return response.text();
    });

    await this.pages.save({ url, body });
    return body;
  }
}
