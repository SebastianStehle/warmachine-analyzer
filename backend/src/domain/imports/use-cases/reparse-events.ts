import { Logger } from '@nestjs/common';
import { Command, CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity, EventRepository } from 'src/domain/database';
import { runWithConcurrency } from 'src/domain/longshanks';
import { ImportEvent } from './import-event';

// Parsing from stored pages only hits the database, so it can run with more parallelism than downloads.
const REPARSE_CONCURRENCY = 4;

export class ReparseEvents extends Command<ReparseEventsResult> {}

export class ReparseEventsResult {
  constructor(
    public readonly reparsed: number,
    public readonly failed: number,
  ) {}
}

@CommandHandler(ReparseEvents)
export class ReparseEventsHandler implements ICommandHandler<ReparseEvents, ReparseEventsResult> {
  private readonly logger = new Logger(ReparseEventsHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(EventEntity)
    private readonly events: EventRepository,
  ) {}

  async execute(): Promise<ReparseEventsResult> {
    const ids = (await this.events.find({ select: { id: true } })).map(({ id }) => id);

    this.logger.log(`Re-parsing ${ids.length} events from stored pages.`);

    let reparsed = 0;
    let failed = 0;
    await runWithConcurrency(ids, REPARSE_CONCURRENCY, async (eventId) => {
      try {
        await this.commandBus.execute(new ImportEvent(eventId, false, true));
        reparsed++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to re-parse event ${eventId}: ${error}`);
      }
    });

    return new ReparseEventsResult(reparsed, failed);
  }
}
