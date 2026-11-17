// Rough faction colors, so that armies of the same faction are easy to spot in long tables.
const FACTION_COLORS: Record<string, string> = {
  cygnar: '#3d7bd9',
  khador: '#c8322f',
  'protectorate of menoth': '#e8dcb0',
  cryx: '#59c25a',
  dusk: '#8f5bd6',
  scharde: '#2fa39a',
  mercenaries: '#d4a63a',
  'southern kriels': '#3fa7c9',
  orgoth: '#9b2335',
  'crucible guard': '#e0b23c',
  khymaera: '#c45bb4',
  infernals: '#7a4fd1',
  'circle orboros': '#6b8f3a',
  skorne: '#b5532d',
  grymkin: '#7f8c4f',
};

const FALLBACK_COLOR = '#8a94a6';

export function factionColor(faction: string | null | undefined) {
  return (faction && FACTION_COLORS[faction.toLowerCase()]) || FALLBACK_COLOR;
}

export const LONGSHANKS_URL = 'https://warmachine.longshanks.org';
