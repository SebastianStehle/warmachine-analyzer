import { Logger } from '@nestjs/common';
import { WikiClient } from './client';
import { parseImageUrls, parsePageImages } from './parsers';

const logger = new Logger('WikiImages');

// The wiki API accepts at most 50 titles per request.
const BATCH_SIZE = 50;
const IMAGE_WIDTH = 400;

function toBatches<T>(values: T[]) {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    result.push(values.slice(i, i + BATCH_SIZE));
  }

  return result;
}

export async function loadPageImages(client: WikiClient, pages: string[]) {
  const files = new Map<string, string>();
  for (const batch of toBatches([...new Set(pages)])) {
    try {
      for (const [page, file] of parsePageImages(await client.getPageContents(batch), batch)) {
        files.set(page, file);
      }
    } catch (error) {
      logger.warn(`Failed to load the images of ${batch.length} pages: ${error}`);
    }
  }

  const urls = new Map<string, string>();
  for (const batch of toBatches([...new Set(files.values())])) {
    try {
      for (const [file, url] of parseImageUrls(await client.getImageUrls(batch, IMAGE_WIDTH), batch)) {
        urls.set(file, url);
      }
    } catch (error) {
      logger.warn(`Failed to load the URLs of ${batch.length} images: ${error}`);
    }
  }

  const result = new Map<string, string>();
  for (const [page, file] of files) {
    const url = urls.get(file);
    if (url) {
      result.set(page, url);
    }
  }

  return result;
}
