import { Column, Entity, Index, PrimaryGeneratedColumn, Repository } from 'typeorm';

export type GamePlayerRepository = Repository<GamePlayerEntity>;

export type GameResult = 'win' | 'loss' | 'draw';

@Entity({ name: 'game_players' })
export class GamePlayerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int')
  gameId: number;

  @Index()
  @Column('int')
  eventId: number;

  @Column('int')
  playerId: number;

  @Column('int', { nullable: true })
  opponentId?: number | null;

  @Index()
  @Column('varchar', { length: 100, nullable: true })
  army?: string | null;

  @Column('varchar', { length: 100, nullable: true })
  opponentArmy?: string | null;

  @Column('varchar', { length: 200, nullable: true })
  caster?: string | null;

  @Column('varchar', { length: 200, nullable: true })
  opponentCaster?: string | null;

  @Index()
  @Column('int', { nullable: true })
  listId?: number | null;

  @Column('varchar', { length: 10 })
  result: GameResult;

  @Column('int', { nullable: true })
  controlPoints?: number | null;

  @Column('int', { nullable: true })
  armyPoints?: number | null;
}
