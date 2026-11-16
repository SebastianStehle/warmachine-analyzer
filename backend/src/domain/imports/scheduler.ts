import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { LongshanksConfig } from 'src/domain/longshanks';
import { DiscoverEvents } from './use-cases';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CrawlerScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(CrawlerScheduler.name);
  private isRunning = false;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap() {
    const { schedule, lookbackDays } = this.configService.getOrThrow<LongshanksConfig>('longshanks');
    if (!schedule) {
      return;
    }

    const job = new CronJob(schedule, () => this.crawl(lookbackDays));
    this.schedulerRegistry.addCronJob('crawler', job);
    job.start();

    this.logger.log(`Crawler scheduled with '${schedule}', looking back ${lookbackDays} days.`);
  }

  private async crawl(lookbackDays: number) {
    // A crawl can take longer than the schedule interval.
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const to = new Date();
      const from = new Date(to.getTime() - lookbackDays * DAY_MS);

      await this.commandBus.execute(new DiscoverEvents(from.toISOString().substring(0, 10), to.toISOString().substring(0, 10)));
    } catch (error) {
      this.logger.error(`Scheduled crawl failed: ${error}`);
    } finally {
      this.isRunning = false;
    }
  }
}
