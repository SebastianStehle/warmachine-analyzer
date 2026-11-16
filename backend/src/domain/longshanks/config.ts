import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface LongshanksConfig {
  baseUrl: string;
  requestDelayMs: number;
  schedule?: string;
  lookbackDays: number;
}

const DEFAULT_REQUEST_DELAY_MS = 1000;
const DEFAULT_LOOKBACK_DAYS = 14;

export const LONGSHANKS_ENV_SCHEMA = Joi.object({
  LONGSHANKS_BASEURL: Joi.string().uri().default('https://warmachine.longshanks.org'),
  LONGSHANKS_REQUEST_DELAY_MS: Joi.number().integer().min(0).default(DEFAULT_REQUEST_DELAY_MS),
  CRAWLER_SCHEDULE: Joi.string().allow('').optional(),
  CRAWLER_LOOKBACK_DAYS: Joi.number().integer().min(1).default(DEFAULT_LOOKBACK_DAYS),
}).unknown(true);

export const longshanksConfig = registerAs<LongshanksConfig>('longshanks', () => ({
  baseUrl: process.env.LONGSHANKS_BASEURL || 'https://warmachine.longshanks.org',
  requestDelayMs: process.env.LONGSHANKS_REQUEST_DELAY_MS
    ? parseInt(process.env.LONGSHANKS_REQUEST_DELAY_MS, 10)
    : DEFAULT_REQUEST_DELAY_MS,
  schedule: process.env.CRAWLER_SCHEDULE || undefined,
  lookbackDays: process.env.CRAWLER_LOOKBACK_DAYS ? parseInt(process.env.CRAWLER_LOOKBACK_DAYS, 10) : DEFAULT_LOOKBACK_DAYS,
}));
