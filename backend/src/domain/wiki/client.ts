import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestThrottle } from 'src/domain/longshanks/throttle';
import { WikiConfig } from './config';

const USER_AGENT = 'warmachine-analyzer (+https://github.com/SebastianStehle)';
const MAX_CONCURRENT_REQUESTS = 1;
const PAGE_SIZE = 500;

@Injectable()
export class WikiClient {
  private readonly logger = new Logger(WikiClient.name);
  private readonly config: WikiConfig;
  private readonly throttle: RequestThrottle;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<WikiConfig>('wiki');
    this.throttle = new RequestThrottle(MAX_CONCURRENT_REQUESTS, this.config.requestDelayMs);
  }

  getTemplates(from?: string) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'allpages',
      apnamespace: '10',
      aplimit: String(PAGE_SIZE),
      format: 'json',
    });

    if (from) {
      params.set('apcontinue', from);
    }

    return this.get(params);
  }

  getRenderedPage(title: string) {
    return this.get(new URLSearchParams({ action: 'parse', page: title, prop: 'text', format: 'json' }));
  }

  private get(params: URLSearchParams) {
    const url = `${this.config.baseUrl}/w/api.php?${params.toString()}`;

    return this.throttle.run(async () => {
      this.logger.log(`Downloading ${url}`);

      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!response.ok) {
        throw new Error(`Failed to download ${url}, got ${response.status}.`);
      }

      return response.text();
    });
  }
}
