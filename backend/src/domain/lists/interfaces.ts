import { PageRequest, SortRequest } from 'src/domain/common/query';
import { GameResult, ListEntryKind } from 'src/domain/database';

export type ListSortField = 'date' | 'event' | 'player' | 'rank' | 'army' | 'caster';

export interface ListFilter extends PageRequest, SortRequest<ListSortField> {
  army?: string;
  caster?: string;
  unit?: string;
  playerId?: number;
  eventId?: number;
  // Matches title, caster, player and event.
  search?: string;
  from?: string;
  to?: string;
}

export interface ListSummary {
  id: number;
  title: string;
  faction: string | null;
  army: string | null;
  caster: string | null;
  totalPoints: number | null;
  eventId: number;
  eventName: string;
  eventDate: string;
  eventPlayers: number;
  playerId: number;
  playerName: string;
  rank: number | null;
  eventWins: number | null;
  eventLosses: number | null;
  // Games in which this exact list was played, linked by the leader.
  games: number;
  wins: number;
}

export interface ListEntry {
  name: string;
  points: number | null;
  depth: number;
  kind: ListEntryKind;
}

export interface ListGame {
  round: number;
  opponentId: number | null;
  scenario: string | null;
  opponentName: string | null;
  opponentArmy: string | null;
  opponentCaster: string | null;
  result: GameResult;
  controlPoints: number | null;
  armyPoints: number | null;
}

export interface ListDetails extends ListSummary {
  format: string | null;
  pointLevel: number | null;
  rawText: string;
  commandCards: string[];
  warnings: string[];
  entries: ListEntry[];
  playedGames: ListGame[];
}
