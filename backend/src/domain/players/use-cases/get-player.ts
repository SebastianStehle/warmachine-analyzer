import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyEntity, ArmyListEntity, EventEntity, FactionEntity, ParticipantEntity, PlayerEntity } from 'src/domain/database';
import { toWinRate } from './get-players';

export interface PlayerList {
  id: number;
  caster: string | null;
}

export interface Participation {
  eventId: number;
  eventName: string;
  eventDate: string;
  eventPlayers: number;
  rank: number;
  army: string | null;
  faction: string | null;
  tournamentPoints: number;
  wins: number;
  losses: number;
  lists: PlayerList[];
}

export interface ArmyUsage {
  army: string;
  faction: string | null;
  events: number;
  wins: number;
  losses: number;
  winRate: number | null;
}

export interface PlayerDetails {
  id: number;
  name: string;
  events: number;
  wins: number;
  losses: number;
  winRate: number | null;
  armies: ArmyUsage[];
  participations: Participation[];
}

export class GetPlayerQuery extends Query<GetPlayerResult> {
  constructor(public readonly playerId: number) {
    super();
  }
}

export class GetPlayerResult {
  constructor(public readonly player: PlayerDetails) {}
}

@QueryHandler(GetPlayerQuery)
export class GetPlayerHandler implements IQueryHandler<GetPlayerQuery, GetPlayerResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ playerId }: GetPlayerQuery): Promise<GetPlayerResult> {
    const player = await this.dataSource.getRepository(PlayerEntity).findOneBy({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found.`);
    }

    const rows = await this.dataSource
      .getRepository(ParticipantEntity)
      .createQueryBuilder('p')
      .innerJoin(EventEntity, 'e', 'e.id = p.eventId')
      .leftJoin(ArmyEntity, 'a', 'a.id = p.armyId')
      .leftJoin(FactionEntity, 'f', 'f.id = a.factionId')
      .select('p.eventId', 'eventId')
      .addSelect('e.name', 'eventName')
      .addSelect('e.date', 'eventDate')
      .addSelect('e.playerCount', 'eventPlayers')
      .addSelect('p.rank', 'rank')
      .addSelect('a.name', 'army')
      .addSelect('f.name', 'faction')
      .addSelect('p.tournamentPoints', 'tournamentPoints')
      .addSelect('p.wins', 'wins')
      .addSelect('p.losses', 'losses')
      .where('p.playerId = :playerId', { playerId })
      .orderBy('e.date', 'DESC')
      .getRawMany();

    const lists = await this.dataSource.getRepository(ArmyListEntity).find({
      where: { playerId },
      relations: { caster: true },
      order: { id: 'ASC' },
    });

    const listsByEvent = new Map<number, PlayerList[]>();
    for (const { id, eventId, caster } of lists) {
      const eventLists = listsByEvent.get(eventId) ?? [];
      eventLists.push({ id, caster: caster?.name ?? null });
      listsByEvent.set(eventId, eventLists);
    }

    const participations: Participation[] = rows.map((row) => ({
      eventId: Number(row.eventId),
      eventName: row.eventName,
      eventDate: row.eventDate,
      eventPlayers: Number(row.eventPlayers),
      rank: Number(row.rank),
      army: row.army,
      faction: row.faction,
      tournamentPoints: Number(row.tournamentPoints),
      wins: Number(row.wins),
      losses: Number(row.losses),
      lists: listsByEvent.get(Number(row.eventId)) ?? [],
    }));

    let wins = 0;
    let losses = 0;
    const armies = new Map<string, ArmyUsage>();
    for (const participation of participations) {
      wins += participation.wins;
      losses += participation.losses;

      if (participation.army) {
        const usage = armies.get(participation.army) ?? {
          army: participation.army,
          faction: participation.faction,
          events: 0,
          wins: 0,
          losses: 0,
          winRate: null,
        };
        usage.faction ??= participation.faction;
        usage.events++;
        usage.wins += participation.wins;
        usage.losses += participation.losses;
        usage.winRate = toWinRate(usage.wins, usage.losses);
        armies.set(participation.army, usage);
      }
    }

    return new GetPlayerResult({
      id: player.id,
      name: player.name,
      events: participations.length,
      wins,
      losses,
      winRate: toWinRate(wins, losses),
      armies: [...armies.values()].sort((a, b) => b.events - a.events),
      participations,
    });
  }
}
