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

  getSections(title: string) {
    return this.get(new URLSearchParams({ action: 'parse', page: title, prop: 'tocdata', format: 'json', formatversion: '2' }));
  }

  getPagesUsingTemplate(template: string, from?: string) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'embeddedin',
      eititle: template,
      eilimit: String(PAGE_SIZE),
      format: 'json',
    });

    if (from) {
      params.set('eicontinue', from);
    }

    return this.get(params);
  }

  getWikitext(title: string) {
    return this.get(new URLSearchParams({ action: 'parse', page: title, prop: 'wikitext', format: 'json', formatversion: '2' }));
  }

  getPageContents(titles: string[]) {
    return this.get(
      new URLSearchParams({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        redirects: '1',
        titles: titles.join('|'),
        format: 'json',
        formatversion: '2',
      }),
    );
  }

  getImageUrls(files: string[], width: number) {
    return this.get(
      new URLSearchParams({
        action: 'query',
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: String(width),
        titles: files.map((file) => `File:${file}`).join('|'),
        format: 'json',
        formatversion: '2',
      }),
    );
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
