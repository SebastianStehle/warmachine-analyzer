import { Logger } from '@nestjs/common';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  ArmyListEntity,
  EventEntity,
  GameEntity,
  GamePlayerEntity,
  ListEntryEntity,
  ParticipantEntity,
  PlayerEntity,
} from 'src/domain/database';
import { isSameCaster, parseArmyLists, ParsedList } from 'src/domain/lists/parser';
import {
  EventInfo,
  GameSide,
  LongshanksClient,
  ParsedGame,
  parseEventPage,
  parseGames,
  parseListTexts,
  parseRounds,
  parseStandings,
  Standing,
} from 'src/domain/longshanks';

export type ImportEventStatus = 'imported' | 'skipped';

export class ImportEvent extends Command<ImportEventResult> {
  constructor(
    public readonly eventId: number,
    public readonly refresh = false,
    // Re-parses a finished event completely from stored pages, including the header.
    public readonly reparse = false,
  ) {
    super();
  }
}

export class ImportEventResult {
  constructor(
    public readonly status: ImportEventStatus,
    public readonly lists = 0,
    public readonly games = 0,
  ) {}
}

interface PlayerList {
  sourceId: number;
  sourceIndex: number;
  list: ParsedList;
}

const listKey = (playerId: number, sourceId: number, sourceIndex: number) => `${playerId}:${sourceId}:${sourceIndex}`;

@CommandHandler(ImportEvent)
export class ImportEventHandler implements ICommandHandler<ImportEvent, ImportEventResult> {
  private readonly logger = new Logger(ImportEventHandler.name);
  private readonly running = new Set<number>();

  constructor(
    private readonly client: LongshanksClient,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(command: ImportEvent): Promise<ImportEventResult> {
    const { eventId } = command;

    // Parallel imports must not work on the same event twice. Other processes are serialized by the event row lock in save().
    if (this.running.has(eventId)) {
      this.logger.log(`Skipping event ${eventId}, it is already being imported.`);
      return new ImportEventResult('skipped');
    }

    this.running.add(eventId);
    try {
      return await this.importEvent(command);
    } finally {
      this.running.delete(eventId);
    }
  }

  private async importEvent({ eventId, refresh, reparse }: ImportEvent) {
    // The header is downloaded unless re-parsing, because it tells whether the event is finished.
    const event = parseEventPage(await this.client.get(`/event/${eventId}/`, reparse), eventId);
    if (!event.isFinished) {
      this.logger.log(`Skipping event ${eventId} (${event.name}), it is not finished.`);
      return new ImportEventResult('skipped');
    }

    const useCache = !refresh;

    const standings = parseStandings(
      await this.client.get(`/events/detail/panel_standings.php?event=${eventId}&section=player`, useCache),
    );

    const games = await this.loadGames(eventId, useCache);
    const lists = await this.loadLists(eventId, standings, useCache);

    let listCount = 0;
    for (const playerLists of lists.values()) {
      listCount += playerLists.length;
    }

    await this.dataSource.transaction((manager) => this.save(manager, event, standings, games, lists));

    this.logger.log(
      `Imported event ${eventId} (${event.name}): ${standings.length} players, ${listCount} lists, ${games.length} games.`,
    );
    return new ImportEventResult('imported', listCount, games.length);
  }

  private async loadGames(eventId: number, useCache: boolean) {
    const firstRound = await this.client.get(`/events/detail/panel_games.php?event=${eventId}&round=1`, useCache);

    const result = parseGames(firstRound);
    for (const round of parseRounds(firstRound)) {
      if (round === 1) {
        continue;
      }

      result.push(
        ...parseGames(await this.client.get(`/events/detail/panel_games.php?event=${eventId}&round=${round}`, useCache)),
      );
    }

    return result;
  }

  private async loadLists(eventId: number, standings: Standing[], useCache: boolean) {
    const result = new Map<number, PlayerList[]>();

    for (const { playerId, listReference } of standings) {
      if (!listReference) {
        continue;
      }

      const path =
        listReference.type === 'record'
          ? `/admin/lists/pop_info.php?id=${listReference.id}&event=${eventId}`
          : `/admin/players/pop_info.php?player=${playerId}&event=${eventId}&tab=list`;

      try {
        const playerLists: PlayerList[] = [];
        for (const { sourceId, text } of parseListTexts(await this.client.get(path, useCache))) {
          // A single list record often contains several lists, separated by their TOTAL POINTS lines.
          const parsed = parseArmyLists(text);
          for (let sourceIndex = 0; sourceIndex < parsed.length; sourceIndex++) {
            const list = parsed[sourceIndex];

            // Usually the start of a list that was cut off, the full list is in another record.
            if (list.entries.length === 0) {
              this.logger.warn(`Skipping list '${list.title}' of player ${playerId} in event ${eventId}, it has no entries.`);
              continue;
            }

            playerLists.push({ sourceId, sourceIndex, list });
          }
        }

        result.set(playerId, playerLists);
      } catch (error) {
        this.logger.warn(`Failed to load lists of player ${playerId} in event ${eventId}: ${error}`);
      }
    }

    return result;
  }

  private async save(
    manager: EntityManager,
    event: EventInfo,
    standings: Standing[],
    games: ParsedGame[],
    lists: Map<number, PlayerList[]>,
  ) {
    const eventId = event.id;

    let rounds = 0;
    for (const { round } of games) {
      rounds = Math.max(rounds, round);
    }

    // Writing the event row first locks it until the transaction ends, so two processes importing the same event run one after another.
    await manager.upsert(
      EventEntity,
      {
        id: eventId,
        name: event.name,
        date: event.date,
        location: event.location,
        type: event.type,
        playerCount: event.playerCount || standings.length,
        rounds,
      },
      ['id'],
    );

    // Lists keep their IDs across imports, so links to them stay valid.
    const existingListIds = new Map<string, number>();
    for (const { id, playerId, sourceId, sourceIndex } of await manager.find(ArmyListEntity, {
      where: { eventId },
      select: { id: true, playerId: true, sourceId: true, sourceIndex: true },
    })) {
      existingListIds.set(listKey(playerId, sourceId, sourceIndex), id);
    }

    // List rows are updated in place instead, everything else of the event is replaced.
    for (const entity of [GamePlayerEntity, GameEntity, ListEntryEntity, ParticipantEntity]) {
      await manager.delete(entity, { eventId });
    }

    const players = new Map<number, string>();
    for (const { playerId, playerName } of standings) {
      players.set(playerId, playerName);
    }
    for (const { sides } of games) {
      for (const { playerId, playerName } of sides) {
        if (playerId && !players.has(playerId)) {
          players.set(playerId, playerName);
        }
      }
    }
    await manager.save(
      PlayerEntity,
      [...players].map(([id, name]) => ({ id, name })),
    );

    // Maps players to their stored lists, so games can reference the list that was played.
    const storedLists = new Map<number, ArmyListEntity[]>();

    for (const standing of standings) {
      const { playerId, army } = standing;
      const playerLists = lists.get(playerId) ?? [];

      await manager.save(ParticipantEntity, {
        eventId,
        playerId,
        rank: standing.rank,
        army,
        faction: playerLists.find(({ list }) => list.faction)?.list.faction ?? null,
        tournamentPoints: standing.tournamentPoints,
        wins: standing.wins,
        losses: standing.losses,
        strengthOfSchedule: standing.strengthOfSchedule,
        controlPoints: standing.controlPoints,
        armyPoints: standing.armyPoints,
      });

      const saved: ArmyListEntity[] = [];
      for (const { sourceId, sourceIndex, list } of playerLists) {
        const values = {
          eventId,
          playerId,
          sourceId,
          sourceIndex,
          title: list.title,
          faction: list.faction,
          // Longshanks is the source of truth for the army, the list header is free text.
          army: army ?? list.army,
          caster: list.caster,
          format: list.format,
          pointLevel: list.pointLevel,
          totalPoints: list.totalPoints,
          commandCards: list.commandCards,
          warnings: list.warnings,
          rawText: list.rawText,
        };

        const key = listKey(playerId, sourceId, sourceIndex);
        const existingId = existingListIds.get(key);

        let entity: ArmyListEntity;
        if (existingId) {
          await manager.update(ArmyListEntity, existingId, values);
          existingListIds.delete(key);
          entity = { ...values, id: existingId } as ArmyListEntity;
        } else {
          entity = await manager.save(ArmyListEntity, values);
        }

        await manager.save(
          ListEntryEntity,
          list.entries.map(({ name, baseName, points, depth, kind }, position) => ({
            listId: entity.id,
            eventId,
            position,
            name,
            baseName,
            points,
            depth,
            kind,
          })),
        );

        saved.push(entity);
      }

      storedLists.set(playerId, saved);
    }

    // Lists that were removed on Longshanks.
    if (existingListIds.size > 0) {
      await manager.delete(ArmyListEntity, [...existingListIds.values()]);
    }

    for (const game of games) {
      await manager.save(GameEntity, {
        id: game.id,
        eventId,
        round: game.round,
        table: game.table,
        scenario: game.scenario,
        isBye: game.isBye,
      });

      const [first, second] = game.sides;
      for (const [side, opponent] of [
        [first, second],
        [second, first],
      ]) {
        if (!side?.playerId) {
          continue;
        }

        await manager.save(GamePlayerEntity, {
          gameId: game.id,
          eventId,
          playerId: side.playerId,
          opponentId: game.isBye ? null : (opponent?.playerId ?? null),
          army: side.army,
          opponentArmy: game.isBye ? null : (opponent?.army ?? null),
          caster: side.caster,
          opponentCaster: game.isBye ? null : (opponent?.caster ?? null),
          listId: this.findPlayedList(side, storedLists.get(side.playerId) ?? [])?.id ?? null,
          result: side.result,
          controlPoints: side.controlPoints,
          armyPoints: side.armyPoints,
        });
      }
    }
  }

  private findPlayedList({ caster }: GameSide, candidates: ArmyListEntity[]) {
    if (caster) {
      const match = candidates.find((list) => list.caster && isSameCaster(list.caster, caster));
      if (match) {
        return match;
      }
    }

    return candidates.length === 1 ? candidates[0] : null;
  }
}
