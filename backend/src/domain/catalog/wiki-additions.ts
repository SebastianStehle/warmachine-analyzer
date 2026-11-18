import { ArmyIndex } from 'src/domain/wiki';

// Models that lists and the shop contain, but the wiki does not index yet. Remove an entry once the wiki has it.
export const WIKI_ADDITIONS: ArmyIndex[] = [
  {
    army: 'Old Umbrey',
    faction: null,
    wikiIndex: '',
    models: [{ name: 'Drago, The Beast Unchained', alias: null, wikiPage: null, type: 'warbeast', isMercenary: false }],
  },
  {
    army: 'Cryx Necrofactorium',
    faction: null,
    wikiIndex: '',
    models: [{ name: 'Mechanithrall Swarm Warden', alias: null, wikiPage: null, type: 'attachment', isMercenary: false }],
  },
  {
    army: 'Army of the Western Reaches',
    faction: null,
    wikiIndex: '',
    models: [
      { name: 'Praetorian Karax Officer & Standard', alias: null, wikiPage: null, type: 'attachment', isMercenary: false },
      { name: 'Tyrant Vorkesh', alias: null, wikiPage: null, type: 'attachment', isMercenary: false },
    ],
  },
  {
    army: '5th Division',
    faction: null,
    wikiIndex: '',
    models: [
      { name: 'Winter Guard Infantry Officer & Standard', alias: null, wikiPage: null, type: 'attachment', isMercenary: false },
    ],
  },
  {
    army: 'Khador Armored Korps',
    faction: null,
    wikiIndex: '',
    models: [{ name: 'Man-O-War Shocktrooper Officer', alias: null, wikiPage: null, type: 'attachment', isMercenary: false }],
  },
];
