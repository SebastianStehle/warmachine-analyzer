import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestThrottle } from 'src/domain/longshanks/throttle';
import { ShopConfig } from './config';

const USER_AGENT = 'warmachine-analyzer (+https://github.com/SebastianStehle)';
const MAX_CONCURRENT_REQUESTS = 1;
// The maximum page size of the product feed of Shopify.
const PAGE_SIZE = 250;

@Injectable()
export class ShopClient {
  private readonly logger = new Logger(ShopClient.name);
  private readonly config: ShopConfig;
  private readonly throttle: RequestThrottle;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<ShopConfig>('shop');
    this.throttle = new RequestThrottle(MAX_CONCURRENT_REQUESTS, this.config.requestDelayMs);
  }

  get baseUrl() {
    return this.config.baseUrl;
  }

  get currency() {
    return this.config.currency;
  }

  // Without the currency the shop picks one from the location of the caller.
  getProducts(page: number) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page), currency: this.config.currency });
    const url = `${this.config.baseUrl}/products.json?${params.toString()}`;

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
