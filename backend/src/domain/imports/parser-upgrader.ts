import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ModelEntity, ModelRepository, SettingEntity, SettingRepository } from 'src/domain/database';
import { PARSER_VERSION, PARSER_VERSION_KEY } from './parser-version';
import { ReparseEvents } from './use-cases';

// A deployment with a new parser would otherwise keep the old parse of all events, until somebody runs the re-parse by hand.
// It runs in the background, so the API is available while the events are replaced one by one.
@Injectable()
export class ParserUpgrader implements OnApplicationBootstrap {
  private readonly logger = new Logger(ParserUpgrader.name);

  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ModelEntity)
    private readonly models: ModelRepository,
    @InjectRepository(SettingEntity)
    private readonly settings: SettingRepository,
  ) {}

  async onApplicationBootstrap() {
    const stored = await this.settings.findOneBy({ key: PARSER_VERSION_KEY });
    if (stored?.value === String(PARSER_VERSION)) {
      return;
    }

    if ((await this.models.count()) === 0) {
      this.logger.warn('Skipping the re-parse for the new parser version, the catalog is empty.');
      return;
    }

    this.logger.log(`Parser version changed from ${stored?.value ?? 'none'} to ${PARSER_VERSION}, re-parsing all events.`);
    this.commandBus.execute(new ReparseEvents()).then(
      ({ reparsed, failed }) => this.logger.log(`Re-parsed ${reparsed} events, failed ${failed}.`),
      (error) => this.logger.error(`Failed to re-parse the events: ${error}`),
    );
  }
}
