export interface DateRange {
  from?: string;
  to?: string;
}

export interface Record {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  // Draws count as half a win.
  winRate: number | null;
}

export interface FactionStats extends Record {
  army: string;
  faction: string | null;
  players: number;
  lists: number;
  mirrors: number;
}

export interface CasterStats extends Record {
  caster: string;
  lists: number;
}

export interface UnitStats extends Record {
  name: string;
  lists: number;
  copies: number;
  averagePoints: number | null;
}

export interface MatchupStats extends Record {
  opponent: string;
}

export interface FactionDetails {
  stats: FactionStats;
  casters: CasterStats[];
  units: UnitStats[];
  matchups: MatchupStats[];
}
