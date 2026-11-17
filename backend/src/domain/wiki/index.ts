import { Module } from '@nestjs/common';
import { WikiClient } from './client';

export * from './client';
export * from './config';
export * from './images';
export * from './indexes';
export * from './parsers';

@Module({
  providers: [WikiClient],
  exports: [WikiClient],
})
export class WikiModule {}
