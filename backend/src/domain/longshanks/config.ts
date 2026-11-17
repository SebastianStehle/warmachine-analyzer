import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface LongshanksConfig {
  baseUrl: string;
  requestDelayMs: number;
  maxConcurrentRequests: number;
  eventConcurrency: number;
  schedule?: string;
  lookbackDays: number;
}

const DEFAULT_BASE_URL = 'https://warmachine.longshanks.org';
const DEFAULT_REQUEST_DELAY_MS = 1000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 2;
const DEFAULT_EVENT_CONCURRENCY = 2;
const DEFAULT_LOOKBACK_DAYS = 14;

export const LONGSHANKS_ENV_SCHEMA = Joi.object({
  LONGSHANKS_BASEURL: Joi.string().uri().default(DEFAULT_BASE_URL),
  LONGSHANKS_REQUEST_DELAY_MS: Joi.number().integer().min(0).default(DEFAULT_REQUEST_DELAY_MS),
  LONGSHANKS_MAX_CONCURRENT_REQUESTS: Joi.number().integer().min(1).default(DEFAULT_MAX_CONCURRENT_REQUESTS),
  CRAWLER_EVENT_CONCURRENCY: Joi.number().integer().min(1).default(DEFAULT_EVENT_CONCURRENCY),
  CRAWLER_SCHEDULE: Joi.string().allow('').optional(),
  CRAWLER_LOOKBACK_DAYS: Joi.number().integer().min(1).default(DEFAULT_LOOKBACK_DAYS),
}).unknown(true);

const intFromEnv = (name: string, fallback: number) => {
  const value = process.env[name];
  return value ? parseInt(value, 10) : fallback;
};

export const longshanksConfig = registerAs<LongshanksConfig>('longshanks', () => ({
  baseUrl: process.env.LONGSHANKS_BASEURL || DEFAULT_BASE_URL,
  requestDelayMs: intFromEnv('LONGSHANKS_REQUEST_DELAY_MS', DEFAULT_REQUEST_DELAY_MS),
  maxConcurrentRequests: intFromEnv('LONGSHANKS_MAX_CONCURRENT_REQUESTS', DEFAULT_MAX_CONCURRENT_REQUESTS),
  eventConcurrency: intFromEnv('CRAWLER_EVENT_CONCURRENCY', DEFAULT_EVENT_CONCURRENCY),
  schedule: process.env.CRAWLER_SCHEDULE || undefined,
  lookbackDays: intFromEnv('CRAWLER_LOOKBACK_DAYS', DEFAULT_LOOKBACK_DAYS),
}));
