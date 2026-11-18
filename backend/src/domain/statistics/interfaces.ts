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
  gamesWithout: number;
  winRateWithout: number | null;
  impact: number | null;
}

export interface CasterArmyStats extends GameRecord {
  army: string;
  faction: string | null;
  lists: number;
}

export interface OpponentCasterStats extends GameRecord {
  caster: string;
}

export interface CasterDetails {
  caster: string;
  wikiPage: string | null;
  imageUrl: string | null;
  lists: number;
  stats: GameRecord;
  knownListRecord: GameRecord;
  armies: CasterArmyStats[];
  units: UnitStats[];
  matchups: MatchupStats[];
  opponentCasters: OpponentCasterStats[];
}

export interface MatchupStats extends GameRecord {
  opponent: string;
}

export type MatchupGrouping = 'faction' | 'army';

export interface MatchupGroup extends GameRecord {
  name: string;
  faction: string | null;
}

export interface MatchupCell extends GameRecord {
  group: string;
  opponent: string;
}

export interface MatchupMatrix {
  groups: MatchupGroup[];
  cells: MatchupCell[];
}

export interface FactionDetails {
  stats: FactionStats;
  knownListRecord: GameRecord;
  casters: CasterStats[];
  units: UnitStats[];
  matchups: MatchupStats[];
}
