import { Logger } from '@nestjs/common';
import { WikiClient } from './client';
import { parseImageUrls, parsePageHeadings, parsePageImages } from './parsers';

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

export interface PageDetails {
  images: Map<string, string>;
  headings: Map<string, string>;
}

export async function loadPageDetails(client: WikiClient, pages: string[]): Promise<PageDetails> {
  const files = new Map<string, string>();
  const headings = new Map<string, string>();
  for (const batch of toBatches([...new Set(pages)])) {
    try {
      const contents = await client.getPageContents(batch);
      for (const [page, file] of parsePageImages(contents, batch)) {
        files.set(page, file);
      }
      for (const [page, heading] of parsePageHeadings(contents, batch)) {
        headings.set(page, heading);
      }
    } catch (error) {
      logger.warn(`Failed to load ${batch.length} pages: ${error}`);
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

  const images = new Map<string, string>();
  for (const [page, file] of files) {
    const url = urls.get(file);
    if (url) {
      images.set(page, url);
    }
  }

  return { images, headings };
}
