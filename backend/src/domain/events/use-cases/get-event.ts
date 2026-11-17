import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyEntity, ArmyListEntity, EventEntity, FactionEntity, ParticipantEntity, PlayerEntity } from 'src/domain/database';
import { EventSummary, toEventSummary } from './get-events';

export interface StandingList {
  id: number;
  caster: string | null;
}

export interface EventStanding {
  rank: number;
  playerId: number;
  playerName: string;
  army: string | null;
  faction: string | null;
  tournamentPoints: number;
  wins: number;
  losses: number;
  strengthOfSchedule: number | null;
  controlPoints: number | null;
  armyPoints: number | null;
  lists: StandingList[];
}

export interface EventDetails extends EventSummary {
  standings: EventStanding[];
}

export class GetEventQuery extends Query<GetEventResult> {
  constructor(public readonly eventId: number) {
    super();
  }
}

export class GetEventResult {
  constructor(public readonly event: EventDetails) {}
}

@QueryHandler(GetEventQuery)
export class GetEventHandler implements IQueryHandler<GetEventQuery, GetEventResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ eventId }: GetEventQuery): Promise<GetEventResult> {
    const event = await this.dataSource.getRepository(EventEntity).findOneBy({ id: eventId });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found.`);
    }

    const participants = await this.dataSource
      .getRepository(ParticipantEntity)
      .createQueryBuilder('p')
      .innerJoin(PlayerEntity, 'pl', 'pl.id = p.playerId')
      .leftJoin(ArmyEntity, 'a', 'a.id = p.armyId')
      .leftJoin(FactionEntity, 'f', 'f.id = a.factionId')
      .select('p')
      .addSelect('pl.name', 'playerName')
      .addSelect('a.name', 'army')
      .addSelect('f.name', 'faction')
      .where('p.eventId = :eventId', { eventId })
      .orderBy('p.rank', 'ASC')
      .getRawAndEntities();

    const lists = await this.dataSource.getRepository(ArmyListEntity).find({
      where: { eventId },
      relations: { caster: true },
      order: { id: 'ASC' },
    });

    const listsByPlayer = new Map<number, StandingList[]>();
    for (const { id, playerId, caster } of lists) {
      const playerLists = listsByPlayer.get(playerId) ?? [];
      playerLists.push({ id, caster: caster?.name ?? null });
      listsByPlayer.set(playerId, playerLists);
    }

    const standings: EventStanding[] = participants.entities.map((participant, index) => ({
      rank: participant.rank,
      playerId: participant.playerId,
      playerName: participants.raw[index].playerName,
      army: participants.raw[index].army ?? null,
      faction: participants.raw[index].faction ?? null,
      tournamentPoints: participant.tournamentPoints,
      wins: participant.wins,
      losses: participant.losses,
      strengthOfSchedule: participant.strengthOfSchedule ?? null,
      controlPoints: participant.controlPoints ?? null,
      armyPoints: participant.armyPoints ?? null,
      lists: listsByPlayer.get(participant.playerId) ?? [],
    }));

    return new GetEventResult({ ...toEventSummary(event, lists.length), standings });
  }
}
