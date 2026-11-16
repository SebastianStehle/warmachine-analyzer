import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageEntity } from 'src/domain/database';
import { LongshanksClient } from './client';

@Module({
  imports: [TypeOrmModule.forFeature([PageEntity])],
  providers: [LongshanksClient],
  exports: [LongshanksClient],
})
export class LongshanksModule {}
