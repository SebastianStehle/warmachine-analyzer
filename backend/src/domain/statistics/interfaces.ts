import { ModelType } from 'src/domain/database';

export interface DateRange {
  from?: string;
  to?: string;
}

export interface GameRecord {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
}

export interface FactionStats extends GameRecord {
  army: string;
  faction: string | null;
  players: number;
  lists: number;
  mirrors: number;
}

export interface CasterStats extends GameRecord {
  caster: string;
  wikiPage: string | null;
  lists: number;
}

export interface UnitStats extends GameRecord {
  name: string;
  type: ModelType | null;
  wikiPage: string | null;
  lists: number;
  copies: number;
  averagePoints: number | null;
}

export interface MatchupStats extends GameRecord {
  opponent: string;
}

export interface FactionDetails {
  stats: FactionStats;
  casters: CasterStats[];
  units: UnitStats[];
  matchups: MatchupStats[];
}
