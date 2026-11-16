import { Module } from '@nestjs/common';
import { GetEventsHandler } from './use-cases/get-events';

export * from './use-cases/get-events';

@Module({
  providers: [GetEventsHandler],
})
export class EventsModule {}
