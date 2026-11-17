import { Module } from '@nestjs/common';
import { GetEventHandler } from './use-cases/get-event';
import { GetEventsHandler } from './use-cases/get-events';

export * from './use-cases/get-event';
export * from './use-cases/get-events';

@Module({
  providers: [
    GetEventHandler, //
    GetEventsHandler,
  ],
})
export class EventsModule {}
