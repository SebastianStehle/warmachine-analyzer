import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface ShopConfig {
  baseUrl: string;
  currency: string;
  requestDelayMs: number;
}

const DEFAULT_BASE_URL = 'https://warmachine.gg';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_REQUEST_DELAY_MS = 1000;

export const SHOP_ENV_SCHEMA = Joi.object({
  SHOP_BASEURL: Joi.string().uri().default(DEFAULT_BASE_URL),
  SHOP_CURRENCY: Joi.string().length(3).default(DEFAULT_CURRENCY),
  SHOP_REQUEST_DELAY_MS: Joi.number().integer().min(0).default(DEFAULT_REQUEST_DELAY_MS),
}).unknown(true);

export const shopConfig = registerAs<ShopConfig>('shop', () => ({
  baseUrl: process.env.SHOP_BASEURL || DEFAULT_BASE_URL,
  currency: (process.env.SHOP_CURRENCY || DEFAULT_CURRENCY).toUpperCase(),
  requestDelayMs: process.env.SHOP_REQUEST_DELAY_MS ? parseInt(process.env.SHOP_REQUEST_DELAY_MS, 10) : DEFAULT_REQUEST_DELAY_MS,
}));
