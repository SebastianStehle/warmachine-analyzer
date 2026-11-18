import { PageRequest, SortRequest } from 'src/domain/common/query';
import { GameResult, ListEntryKind, ModelType } from 'src/domain/database';

export type ListSortField = 'date' | 'event' | 'player' | 'rank' | 'army' | 'caster' | 'points' | 'price';

export interface ListFilter extends PageRequest, SortRequest<ListSortField> {
  army?: string[];
  caster?: string[];
  pointLevel?: number[];
  maxRank?: number;
  unit?: string;
  playerId?: number;
  eventId?: number;
  search?: string;
  from?: string;
  to?: string;
}

export interface ListSummary {
  id: number;
  title: string;
  faction: string | null;
  army: string;
  caster: string | null;
  pointLevel: number | null;
  totalPoints: number | null;
  price: number | null;
  currency: string | null;
  eventId: number;
  eventName: string;
  eventDate: string;
  eventPlayers: number;
  playerId: number;
  playerName: string;
  rank: number | null;
  eventWins: number | null;
  eventLosses: number | null;
  games: number;
  wins: number;
}

export interface ListEntry {
  name: string;
  points: number | null;
  depth: number;
  kind: ListEntryKind;
  modelName: string | null;
  modelType: ModelType | null;
  wikiPage: string | null;
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

export interface ListProduct {
  title: string;
  url: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
  available: boolean;
}

export interface OwnedProduct {
  shopId: string;
  quantity: number;
}

export interface ListPrice {
  listId: number;
  price: number | null;
  products: ListProduct[];
}

export interface ShopProductContent {
  name: string;
  quantity: number;
}

export interface ShopProduct {
  shopId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  price: number;
  available: boolean;
  models: ShopProductContent[];
}

export interface ListDetails extends ListSummary {
  casterImageUrl: string | null;
  format: string | null;
  rawText: string;
  commandCards: string[];
  warnings: string[];
  entries: ListEntry[];
  playedGames: ListGame[];
  products: ListProduct[];
  unpricedModels: string[];
}

export interface PointLevelOption {
  pointLevel: number;
  lists: number;
}

export interface CasterOption {
  caster: string;
  army: string;
  lists: number;
}
