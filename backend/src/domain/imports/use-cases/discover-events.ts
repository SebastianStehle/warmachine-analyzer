import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity, EventRepository } from 'src/domain/database';
import { LongshanksClient, LongshanksConfig, parseResultEventIds, runWithConcurrency } from 'src/domain/longshanks';
import { ImportEvent } from './import-event';

const DAY_MS = 24 * 60 * 60 * 1000;
// Longshanks result pages get long, so the range is requested in chunks.
const CHUNK_DAYS = 31;
// The results page filters by record, these values include every player.
const MAX_LOSSES_FILTER = 3;

export class DiscoverEvents extends Command<DiscoverEventsResult> {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly refresh = false,
    // Overrides CRAWLER_EVENT_CONCURRENCY.
    public readonly concurrency?: number,
  ) {
    super();
  }
}

export class DiscoverEventsResult {
  constructor(
    public readonly found: number,
    public readonly imported: number,
    public readonly failed: number,
  ) {}
}

const formatDate = (date: Date) => date.toISOString().substring(0, 10);

@CommandHandler(DiscoverEvents)
export class DiscoverEventsHandler implements ICommandHandler<DiscoverEvents, DiscoverEventsResult> {
  private readonly logger = new Logger(DiscoverEventsHandler.name);

  constructor(
    private readonly client: LongshanksClient,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
    @InjectRepository(EventEntity)
    private readonly events: EventRepository,
  ) {}

  async execute(command: DiscoverEvents): Promise<DiscoverEventsResult> {
    const { from, to, refresh } = command;
    const concurrency = command.concurrency ?? this.configService.getOrThrow<LongshanksConfig>('longshanks').eventConcurrency;

    const eventIds = new Set<number>();
    for (const [chunkFrom, chunkTo] of this.chunks(from, to)) {
      const html = await this.client.get(
        `/results/?date_from=${chunkFrom}&date_to=${chunkTo}&min_win=0&max_loss=${MAX_LOSSES_FILTER}&list_required=1`,
        false,
      );

      for (const id of parseResultEventIds(html)) {
        eventIds.add(id);
      }
    }

    const pending: number[] = [];
    for (const eventId of eventIds) {
      if (refresh || !(await this.events.existsBy({ id: eventId }))) {
        pending.push(eventId);
      }
    }

    this.logger.log(
      `Found ${eventIds.size} events with lists between ${from} and ${to}, importing ${pending.length} with ${concurrency} in parallel.`,
    );

    let imported = 0;
    let failed = 0;
    await runWithConcurrency(pending, concurrency, async (eventId) => {
      try {
        const { status } = await this.commandBus.execute(new ImportEvent(eventId, refresh));
        if (status === 'imported') {
          imported++;
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to import event ${eventId}: ${error}`);
      }
    });

    return new DiscoverEventsResult(eventIds.size, imported, failed);
  }

  private chunks(from: string, to: string) {
    const result: [string, string][] = [];
    const end = new Date(to);

    let start = new Date(from);
    while (start <= end) {
      const chunkEnd = new Date(Math.min(start.getTime() + (CHUNK_DAYS - 1) * DAY_MS, end.getTime()));
      result.push([formatDate(start), formatDate(chunkEnd)]);
      start = new Date(chunkEnd.getTime() + DAY_MS);
    }

    return result;
  }
}
