# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Warmachine Analyzer imports Warmachine (MkIV) tournament data from [Longshanks](https://warmachine.longshanks.org/) — events, players, games and the submitted army lists — and turns it into meta analysis: which factions, casters, themes and models are played, how they perform, and how they match up against each other.

The stack mirrors [pangostack](https://github.com/SebastianStehle/pangostack). It consists of independent npm packages — each manages its own dependencies, so run `npm install` in each folder separately. The root package.json is tooling-only (husky, plus the `dev` convenience scripts); it is not an npm workspace:

- **backend/** — NestJS API (port 3000). Imports data from Longshanks, parses army lists, stores everything in Postgres and serves the analysis endpoints.
- **frontend/** — Vite + React 18 UI for browsing events and lists and exploring the statistics. Talks to the backend via a generated API client.

There is no worker package and no Temporal. The crawler is a CLI (`npm run crawl`, `src/crawl.ts`) plus an optional cron job in the backend (`CRAWLER_SCHEDULE`). Both dispatch the same `ImportEvent` / `DiscoverEvents` commands. Add a worker only if imports become long-running or need retries across restarts.

## Data source: Longshanks

There is no API, but everything we need is public HTML — no login required. The event page loads its tabs with jQuery `.load()` from these endpoints:

| What | URL | Notes |
|---|---|---|
| Event header | `/event/{event}/` | Name (`h1`), date, location, `N of M players`, status (`Finished`). |
| Standings | `/events/detail/panel_standings.php?event={event}&section=player` | `#player .ranking`: one `div.player#player_{id}` per player (rank, army, TP, wins/losses, SOS/VPS/APS) followed by `div.player.accordion.{id}` rows per round (opponent, result). |
| Games of a round | `/events/detail/panel_games.php?event={event}&round={n}` | `#games .game#game_{id}`: per player faction, leader (`title="<Caster> - <Army> Leader"`), winner/loser, CP (`.score.vp`), AP (`.score.ap`), scenario. `#round_selector` lists all rounds. |
| Single list record | `/admin/lists/pop_info.php?id={list}&event={event}` | Linked from standings via `pop_list(list, player, event)`. One record can contain several lists. |
| Multiple list records | `/admin/players/pop_info.php?player={player}&event={event}&tab=list` | Linked via `pop_user(player, event, 'list')`. `#edit_player_list` has one column per list. |
| Finding events | `/results/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&min_win=0&max_loss=3&list_required=1` | Player results with links to `/event/{id}/`. Collect the distinct event ids. |

- The raw list text is in a hidden `textarea#list_{id}`, lines joined with ` || `, whitespace preserved. Always parse the textarea, not the rendered table (the table collapses the indentation).
- List text is the War Room export: title, `<Faction> - <Army>`, `<Format> - <N> pts`, `PC CARD`, then one line per entry: optional points, indentation, name. Column 8 = top level, deeper = attached to the entry above (battlegroup, mounts). Lines like `3 HEAD - Focus Vault` are modules of the entry above. Duplicates are numbered (`Farrow Sapper 1`, `Farrow Sapper 2`). Then `PC COMMAND CARD` and `TOTAL POINTS x/y`.
- Longshanks calls the army (e.g. `House Kallyss`) the "Army" — that is what the faction stats group by. The parent faction (`Dusk`) comes from the list header.
- Keep all Longshanks-specific code (HTTP, HTML parsing) in `backend/src/domain/longshanks/` so the rest of the app only sees typed domain objects.
- Be a polite client: all requests go through `RequestThrottle` (at most `LONGSHANKS_MAX_CONCURRENT_REQUESTS` in flight, `LONGSHANKS_REQUEST_DELAY_MS` between starts), a descriptive User-Agent, and raw responses are stored in the `pages` table so a re-parse never needs a re-download.
- Events are imported in parallel (`CRAWLER_EVENT_CONCURRENCY`, CLI `--parallel`). The throttle is shared, so more parallel events do not mean more load on Longshanks.
- Imports are idempotent: one transaction per event, the event row is written first (it locks the row, so the same event never imports twice at once), list rows are updated in place so their IDs stay stable, everything else of the event is replaced.
- A single list record can contain several lists (split by `TOTAL POINTS`), and players can have several records. `sourceId` + `sourceIndex` identify a list.
- `LONGSHANKS_EMAIL` / `LONGSHANKS_PASSWORD` are optional and currently unused. Never commit them, never log them.

## Data source: Warmachine Academy wiki

- The official model catalog comes from the army indexes of https://warmachineacademy.miraheze.org (MediaWiki). Each army page ends with an index from a template named `<Army> Footer`; the importer lists all templates via `api.php?action=query&list=allpages&apnamespace=10` and parses the rendered footers (`action=parse`). Legacy and Unlimited indexes are skipped.
- Keep all wiki-specific code in `backend/src/domain/wiki/`. Requests are throttled (`WIKI_REQUEST_DELAY_MS`).
- `UpdateCatalog` (`npm run crawl -- --catalog`) loads the indexes, writes `src/domain/catalog/catalog.json` (sorted, committed to the repository), and imports it (`--reparse` re-parses all events afterwards). Do not edit the catalog file by hand, rerun the command.
- `ImportCatalog` upserts factions, armies, models and army models by name from the catalog file. `CatalogSeeder` runs it on startup when the database has no models.
- List entries are matched to models in app code (`ModelMatcher`, Levenshtein distance), not in the database, so the matching stays DB-agnostic and testable. Unmatched entries keep `modelId = null`; keep the name as written.

## Data source: Shop

- Products come from the Shopify product feed of https://warmachine.gg (`/products.json?limit=250&page=N&currency=EUR`), paged until an empty page. Keep the shop code in `backend/src/domain/shop/` (client, parser, pricing).
- The contents of a product are parsed from the "What's in the box?" list of the description (`Name (Type)`, optional quantity like `3 x`), otherwise from the title. Matching to models uses `ModelMatcher` with the army tags of the product (`warmachine-house-kallyss`).
- `ImportShop` upserts products by Shopify id, replaces their models, deletes products that disappeared and runs `UpdatePrices`. `ImportEvent` runs `UpdatePrices` for its lists.
- `findCheapestProducts` solves the cheapest product combination per list as an integer program with HiGHS (`highs` package). Prices are stored in cents.
- Kits that build one of several models (`Toro/Suppressor/Vindicator` titles, `Build options:` lines) are stored as product models with the same `choice` index. The solver lets each bought kit build only one model of a choice.

## Domain

- **Event** — Longshanks event id, name, date, location, format (e.g. Steamroller, Iron Gauntlet), points level, player count.
- **Player** — Longshanks player id and name.
- **Participation** — a player in an event: final rank, tournament points, tiebreakers (SOS, Control Points, Army Points), and one or more submitted lists.
- **ArmyList** — the raw list text as submitted plus the parsed result: faction, army (theme / Army list), caster, points, and list entries (model or unit, size, attachments, points).
- **Faction / Army / Model** — the official catalog from the wiki. A model belongs to one or more armies (`army_models`, mercenaries are flagged) and has a type (leader, warjack, warbeast, battle-engine, solo, unit, attachment, structure). List entries reference their model if they match one.
- **Game** — round, both participants, result, which of each player's lists was played (if known), scenario, Control Points and Army Points.

Strong referential integrity:

- Never store the name of another entity (army, faction, caster, opponent), store its id with a foreign key and join for names. Text columns are only for data that has no entity, e.g. a list entry as written in the list.
- Every reference is a `@ManyToOne` relation next to its id column, with non-optional types (`army: ArmyEntity`, `caster: ModelEntity | null`). Nullable columns are `T | null`, never optional.
- Do not copy foreign keys that can be reached through a parent (game players reach their event through the game, list entries through the list).
- Rows of an event cascade with the event. References to the catalog and to players are `RESTRICT`, the only `SET NULL` is the played list of a game, because lists are deleted when they disappear from Longshanks.
- Only armies of the catalog are analyzed: lists of unknown armies are not stored, participants and games keep `armyId = NULL`. Army lookup is by name only, never guessed from the faction. Imports fail while the catalog is empty. Write parents before children in imports.

List parsing is the core of the tool. Keep the raw text, parse into a normalized structure, and store parse warnings instead of dropping lists that do not parse cleanly. The parser is a pure function with unit tests built from real list texts.

## Analysis (first version)

- Faction, army and caster representation over time and per event size.
- Win rates per faction, army and caster, with sample sizes shown next to every number.
- Matchup matrix faction vs faction (and caster vs caster when the sample is large enough).
- Model / unit inclusion rates per faction and how inclusion relates to win rate.
- Top lists: lists from top placements, filterable by faction, caster, date range and event format.

## Commands

From the repo root, `npm run install:all` installs the root and both packages. `npm run dev` starts Postgres via docker compose and then runs backend and frontend concurrently. Related root scripts: `dev:infra`, `dev:infra:down`, `dev:backend`, `dev:frontend`.

Each package: `npm run dev` (watch mode), `npm run build`, `npm run lint` / `npm run lint:fix` (eslint, `--max-warnings 0`), `npm run format` (prettier), `npm test` (vitest).

Backend only:
- `npm run test:int` — integration tests with TestContainers (needs Docker). Set `TEST_DB_URL` to an admin connection of an existing Postgres server to skip the container.
- `npm run crawl -- --event <id>` or `npm run crawl -- --from <date> [--to <date>] [--parallel <n>]` — import from Longshanks. `--refresh` ignores the page cache.
- `npm run crawl -- --reparse` — re-parse all imported events from stored pages, without downloading. Run it after parser changes.
- Deployments re-parse by themselves: increase `PARSER_VERSION` (`src/domain/imports/parser-version.ts`) whenever list parsing, model matching or army resolution changes. On startup the backend imports `catalog.json` when it differs from the imported catalog (hash in the `settings` table), then re-parses all events in the background when the parser version or the catalog changed. A re-parse without failures stores both.
- `npm run prune` — drop all tables, including the page cache. Migrations and the catalog seed run again on the next start.
- `npm run crawl -- --shop` — import the shop products and calculate the price of every list.
- `npm run crawl -- --catalog [--reparse]` — load factions, armies and models from the wiki into `catalog.json` and import it, optionally re-parse all events.
- `npm run typeorm:generate-migrations <Name>` — generate TypeORM migrations (data source: `src/domain/database/data-source.ts`).

Env vars are validated per domain with Joi schemas (`DB_ENV_SCHEMA`, `LONGSHANKS_ENV_SCHEMA`, …) combined in `app.module.ts`. New env vars must be added to the matching schema, otherwise startup fails. See `backend/.env.example`.

## Code generation

Only the OpenAPI spec is committed. The API client is generated from it and is gitignored:

| Spec | Owned by | Client generated from it |
|---|---|---|
| `backend/openapi.yaml` | backend | `frontend/src/api/generated/` |

- `npm run generate` in frontend/ generates the client (needs Docker, uses `openapitools/openapi-generator-cli` with `typescript-fetch`). It runs automatically before `npm run dev`.
- After changing controller DTOs or endpoints, run `npm run openapi` in backend/ while its dev server is running, then `npm run generate` in frontend/.
- Never edit the generated folders.

## Architecture

### Backend

- **CQRS pattern** (@nestjs/cqrs): all domain logic lives in `src/domain/<area>/use-cases/` as `Command`/`Query` classes with co-located `@CommandHandler`/`@QueryHandler` classes. Controllers in `src/controllers/` are thin — they dispatch to the bus and map results to DTOs.
- **Domain areas** (`src/domain/`): `database` (entities, migrations, `CoreModule` with config + TypeORM + CQRS shared by API and CLI), `longshanks` (HTTP client with page cache, HTML parsers), `wiki` (wiki client, army index parser), `shop` (shop client, product parser, pricing), `catalog` (catalog file format and builder), `imports` (`ImportEvent`, `DiscoverEvents`, scheduler), `lists` (list parser, model matcher, list queries), `events`, `statistics`.
- An import replaces all rows of the event in one transaction, so imports are idempotent.
- Games are linked to the played list by comparing the game leader with the list caster (`isSameCaster`, tolerant to typos). Players with a single list always get that list.
- Parser tests are built around real data: `test/fixtures/lists/*.txt` are real list texts from Longshanks (one per quirk), `test/fixtures/*.html` are trimmed real pages. When a list parses wrongly, add the real text as a fixture and a test for it before fixing the parser.
- **Database**: TypeORM + Postgres. Entities in `src/domain/database/entities/`, migrations in `src/domain/database/migrations/` — migrations are explicitly registered in `app.module.ts`, so new migrations must be added there.
- Statistics are computed by query handlers. If they become slow, add materialized aggregates that the import refreshes — do not hand-write SQL against a specific database.

### Frontend

- Vite + React 19, TypeScript, Tailwind 4 + HeroUI v3 (React Aria based components, theme in `src/index.css`). Server state via @tanstack/react-query, client state via zustand, forms via react-hook-form + yup, charts via recharts.
- All backend calls go through the generated client in `src/api/generated/` — never hand-write fetch calls to the backend.
- Pages in `src/pages/` (events/, lists/, statistics/); shared components in `src/components/`.
- Backend URL configured via `VITE_SERVER_URL` in `.env`.
- Use HeroUI components for every control (Table, Select, Autocomplete, SearchField, Switch, Tabs, Pagination, DateRangePicker, Card, Chip, Alert, Breadcrumbs, Link). Do not write controls with behavior yourself and do not add another component library. Debouncing via use-debounce.
- HeroUI is compound (`<Table.Content>`, `<Select.Popover>`); the docs examples live in the HeroUI repository under `apps/docs/src/demos/en/`.
- Sortable tables: `useClientSort` (client side) or `useServerSort` (URL) provide `sortDescriptor`/`onSortChange` for `Table.Content`, columns via `SortableColumn`.
- Navigation in HeroUI links and table rows uses `href`; `AriaRouter` in `App.tsx` connects React Aria to the router.
- Colors are HeroUI tokens (`bg-surface`, `text-muted`, `text-accent`, `border-border`, `text-danger`), never raw colors.

## Docker and CI

- `Dockerfile` (repository root): generates the API client, lints, builds and unit tests backend and frontend, the runtime image serves the frontend from the backend on port 3000.
- `.github/workflows/build.yml`: integration tests on the runner (TestContainers needs Docker), then builds the image and pushes it to `ghcr.io/<owner>/<repository>` on pushes to `main`.
- `dev/docker-compose.yml`: Postgres for development (`npm run dev:infra` only starts this service), the published image as `analyzer`, Watchtower in the `autoupdate` profile to update it automatically, and Caddy (`squidex/caddy-proxy`, HTTPS for `ANALYZER_DOMAIN`) in the `proxy` profile.

## Coding Guidelines

* Always run linting after code generation to fix formatting issues.
* Always use IsEnum, not IsIn to make it consistent.
* Always use named constants for magic numbers.
* Never give a `.ts` file the same name as a `.json` file in the same folder. ts-node resolves `./name` to the JSON first (e.g. `catalog-file.ts` next to `catalog.json`).
* Do keep the number of tests small.
* Do not add unnecessary types, e.g. `void` for methods or return types that can easily be derived.
* Do not comment database entities.
* Do not comment internal method, instead ensure that we use good names.
* Do not fail silently in case of errors. Try to log something if it makes sense.
* Do not generate migrations manually, use the right command for that (see commands).
* Do not make any assumptions about the used database.
* Do not omit brackets, e.g. `afterAll(() => context.close());`
* Do not update generated code files manually like package-lock.json. Use the right tools for that, e.g. `npm i`
* Do not use lightgray for normal text as it is difficult to read.
* Do not use reduce on array, write it manually.
* Do not write queries manually when using repositories to stay independent from the actual database.
* If you write comments for types or members, write a single line only, keep it condensed and short.
* Keep API descriptions via ApiOperation very short.
* Move shared code in tests to `beforeEach` or `beforeAll`
* Only write comments to explain the why, not what the code does. Do not comment properties, parameters or functions to describe what they are or do, use good names instead.
* Never commit on your own. Leave changes uncommitted, the user reviews and commits them.
* Rely on prettier for formatting.
* Reuse TestContainers when possible, do not spin them up for every single test.
* Use a fromDomain method for response-dtos. Do not construct the dtos in the constructor.
* Use HeroUI components as much as possible.
* Use spread operators and simplifications for mappings.
* Order property assignments in object literals like the declaration of the target type (entity, interface, DTO), e.g. `{ gameId, eventId, playerId, opponentId, ... }` in the column order of `GamePlayerEntity`. Prefer explicit assignments over spreads when the source has a different order.
* Use strict types for typescript code.
* Use TestContainers for database tests.
* Use the following syntax for tests: `it('should do y when y')`
* Use vitest for all tests.
* Always show the sample size next to a percentage in the UI and in API responses.
* Write documentation in a very easy and practical style, so that it easy to follow. It should be very hands-on.

* When mapping code, destructure the source instead of repeating the variable name:

```ts
// DONT
.map((list) => ({
  faction: list.faction,
  caster: list.caster,
  points: list.points,
}))

// DO
.map(({ faction, caster, points }) => ({
  faction,
  caster,
  points,
}))
```

Format @ApiProperty like this

```ts
@ApiProperty({
  description: 'The faction of the list.',
  required: true,
})
```

or

```ts
@ApiProperty({
  description: 'The faction of the list.',
})
```

### Generated code

* After an API change, run `npm run openapi` in `backend` while its dev server is running, then `npm run generate` in `frontend`. See "Code generation".

### Backend Migration

* Run `npm run typeorm:generate-migrations <NAME_OF_MIGRATION>` in the `backend` directory.
* Every schema change gets a new migration. Never change or regenerate existing migrations, the database holds crawled data that must survive updates.
