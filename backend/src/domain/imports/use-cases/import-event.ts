import { Logger } from '@nestjs/common';
import { Command, CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  ArmyListEntity,
  EventEntity,
  GameEntity,
  GamePlayerEntity,
  ListEntryEntity,
  ParticipantEntity,
  PlayerEntity,
} from 'src/domain/database';
import { loadModelMatcher } from 'src/domain/lists/catalog';
import { CatalogArmy, matchListEntries, ModelMatcher, resolveListArmy } from 'src/domain/lists/model-matcher';
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
import { UpdatePrices } from './update-prices';

export type ImportEventStatus = 'imported' | 'skipped';

export class ImportEvent extends Command<ImportEventResult> {
  constructor(
    public readonly eventId: number,
    public readonly refresh = false,
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

interface StoredList {
  id: number;
  armyId: number;
  casterId: number | null;
  casterName: string | null;
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
    private readonly commandBus: CommandBus,
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

    const matcher = await loadModelMatcher(this.dataSource);
    if (!matcher.hasArmies) {
      throw new Error('The catalog is empty, run "npm run crawl -- --catalog" first.');
    }

    const listCount = await this.dataSource.transaction((manager) => this.save(manager, matcher, event, standings, games, lists));

    await this.commandBus.execute(new UpdatePrices(eventId));

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
    matcher: ModelMatcher,
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

    // Game players go with their games. Lists are updated in place, so only their entries are replaced.
    await manager.delete(GameEntity, { eventId });
    await manager.delete(ParticipantEntity, { eventId });
    if (existingListIds.size > 0) {
      await manager.delete(ListEntryEntity, { listId: In([...existingListIds.values()]) });
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

    const storedLists = new Map<number, StoredList[]>();
    const playerArmies = new Map<number, number | null>();

    for (const standing of standings) {
      const { playerId } = standing;
      const playerLists = lists.get(playerId) ?? [];
      const registered = matcher.findArmy(standing.army ?? playerLists.find(({ list }) => list.army)?.list.army);

      // Armies that are not in the wiki are ignored, so all statistics only contain armies of the catalog.
      const resolved: { playerList: PlayerList; army: CatalogArmy }[] = [];
      for (const playerList of playerLists) {
        const army = resolveListArmy(playerList.list, matcher, registered);
        if (army) {
          resolved.push({ playerList, army });
        }
      }

      // Some players are registered with the wrong army, their lists tell the real one when they all agree.
      const listArmies = new Set(resolved.map(({ army }) => army.id));
      const armyId = listArmies.size === 1 ? [...listArmies][0] : (registered?.id ?? null);
      playerArmies.set(playerId, armyId);

      await manager.save(ParticipantEntity, {
        eventId,
        playerId,
        rank: standing.rank,
        armyId,
        tournamentPoints: standing.tournamentPoints,
        wins: standing.wins,
        losses: standing.losses,
        strengthOfSchedule: standing.strengthOfSchedule,
        controlPoints: standing.controlPoints,
        armyPoints: standing.armyPoints,
      });

      const saved: StoredList[] = [];
      for (const { playerList, army } of resolved) {
        saved.push(await this.saveList(manager, matcher, eventId, playerId, army, playerList, existingListIds));
      }

      storedLists.set(playerId, saved);
    }

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
      const sides = new Map(
        game.sides
          .filter((side): side is GameSide => !!side?.playerId)
          .map((side) => [side, this.resolveSide(matcher, side, storedLists.get(side.playerId!) ?? [], playerArmies)]),
      );

      for (const [side, opponent] of [
        [first, second],
        [second, first],
      ]) {
        if (!side?.playerId) {
          continue;
        }

        const own = sides.get(side)!;
        const other = !game.isBye && opponent ? sides.get(opponent) : undefined;

        await manager.save(GamePlayerEntity, {
          gameId: game.id,
          playerId: side.playerId,
          opponentId: game.isBye ? null : (opponent?.playerId ?? null),
          armyId: own.armyId,
          opponentArmyId: game.isBye ? null : (other?.armyId ?? matcher.findArmy(opponent?.army)?.id ?? null),
          casterId: own.casterId,
          opponentCasterId: game.isBye || !opponent ? null : (other?.casterId ?? this.findLeaderId(matcher, opponent, null)),
          listId: own.list?.id ?? null,
          result: side.result,
          controlPoints: side.controlPoints,
          armyPoints: side.armyPoints,
        });
      }
    }

    let listCount = 0;
    for (const saved of storedLists.values()) {
      listCount += saved.length;
    }

    return listCount;
  }

  private async saveList(
    manager: EntityManager,
    matcher: ModelMatcher,
    eventId: number,
    playerId: number,
    army: CatalogArmy,
    { sourceId, sourceIndex, list }: PlayerList,
    existingListIds: Map<string, number>,
  ): Promise<StoredList> {
    const { modelIds, casterId } = matchListEntries(list, matcher, army.name);

    const values = {
      eventId,
      playerId,
      sourceId,
      sourceIndex,
      title: list.title,
      armyId: army.id,
      casterId,
      format: list.format,
      pointLevel: list.pointLevel,
      totalPoints: list.totalPoints,
      commandCards: list.commandCards,
      warnings: list.warnings,
      rawText: list.rawText,
    };

    const key = listKey(playerId, sourceId, sourceIndex);

    let id = existingListIds.get(key);
    if (id) {
      await manager.update(ArmyListEntity, id, values);
      existingListIds.delete(key);
    } else {
      id = (await manager.insert(ArmyListEntity, values)).identifiers[0].id as number;
    }

    await manager.insert(
      ListEntryEntity,
      list.entries.map(({ name, baseName, points, depth, kind }, position) => ({
        listId: id,
        position,
        name,
        baseName,
        points,
        depth,
        kind,
        modelId: modelIds[position],
      })),
    );

    return { id, armyId: army.id, casterId, casterName: list.caster };
  }

  // The played list knows the real army and caster, the game page only has what the player registered.
  private resolveSide(matcher: ModelMatcher, side: GameSide, candidates: StoredList[], playerArmies: Map<number, number | null>) {
    const list = this.findPlayedList(matcher, side, candidates);
    const armyId = list?.armyId ?? playerArmies.get(side.playerId!) ?? matcher.findArmy(side.army)?.id ?? null;
    const casterId = list?.casterId ?? this.findLeaderId(matcher, side, armyId);

    return { list, armyId, casterId };
  }

  private findLeaderId(matcher: ModelMatcher, { caster, army }: GameSide, armyId: number | null) {
    if (!caster) {
      return null;
    }

    const armyName = matcher.armyName(armyId) ?? matcher.findArmy(army)?.name;
    const model = matcher.match(caster, armyName);
    return model?.type === 'leader' ? model.id : null;
  }

  // Longshanks spells leaders differently than the lists, so the names are compared loosely when the catalog does not know the leader.
  private findPlayedList(matcher: ModelMatcher, side: GameSide, candidates: StoredList[]) {
    const casterId = this.findLeaderId(matcher, side, null);
    const match = candidates.find(
      (list) =>
        (casterId !== null && list.casterId === casterId) ||
        (!!side.caster && !!list.casterName && isSameCaster(list.casterName, side.caster)),
    );

    return match ?? (candidates.length === 1 ? candidates[0] : null);
  }
}
