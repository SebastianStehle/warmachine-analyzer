import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface WikiConfig {
  baseUrl: string;
  requestDelayMs: number;
}

const DEFAULT_BASE_URL = 'https://warmachineacademy.miraheze.org';
const DEFAULT_REQUEST_DELAY_MS = 500;

export const WIKI_ENV_SCHEMA = Joi.object({
  WIKI_BASEURL: Joi.string().uri().default(DEFAULT_BASE_URL),
  WIKI_REQUEST_DELAY_MS: Joi.number().integer().min(0).default(DEFAULT_REQUEST_DELAY_MS),
}).unknown(true);

export const wikiConfig = registerAs<WikiConfig>('wiki', () => ({
  baseUrl: process.env.WIKI_BASEURL || DEFAULT_BASE_URL,
  requestDelayMs: process.env.WIKI_REQUEST_DELAY_MS ? parseInt(process.env.WIKI_REQUEST_DELAY_MS, 10) : DEFAULT_REQUEST_DELAY_MS,
}));
