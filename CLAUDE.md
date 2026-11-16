# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Warmachine Analyzer imports Warmachine (MkIV) tournament data from [Longshanks](https://warmachine.longshanks.org/) — events, players, games and the submitted army lists — and turns it into meta analysis: which factions, casters, themes and models are played, how they perform, and how they match up against each other.

The stack mirrors [pangostack](https://github.com/SebastianStehle/pangostack). It consists of independent npm packages — each manages its own dependencies, so run `npm install` in each folder separately. The root package.json is tooling-only (husky, plus the `dev` convenience scripts); it is not an npm workspace:

- **backend/** — NestJS API (port 3000). Imports data from Longshanks, parses army lists, stores everything in Postgres and serves the analysis endpoints.
- **frontend/** — Vite + React 18 UI for browsing events and lists and exploring the statistics. Talks to the backend via a generated API client.

There is no worker package and no Temporal. Imports are plain scheduled jobs in the backend (`@nestjs/schedule`) plus a manual "import event" command. Add a worker only if imports become long-running or need retries across restarts.

## Data source: Longshanks

- Base URL: `https://warmachine.longshanks.org/`. Events live at `/event/{id}/`, recent results at `/results/`, players at `/players/`.
- Standings, games and lists of an event are loaded through tabs (podium, games, stats) that the static HTML does not contain. The exact endpoints still have to be discovered in a logged-in browser session (network tab) and documented here before the importer is written.
- There is no public API. The importer logs in with a real account and parses HTML. Keep all Longshanks-specific code (HTTP, cookies, HTML parsing) in `backend/src/domain/longshanks/` so the rest of the app only sees typed domain objects.
- Be a polite client: one request at a time, a fixed delay between requests (named constant), a descriptive User-Agent, and cache raw responses in the database so a re-parse never needs a re-download.
- Credentials come from `LONGSHANKS_EMAIL` and `LONGSHANKS_PASSWORD` in `backend/.env`. Never commit them, never log them.

## Domain

- **Event** — Longshanks event id, name, date, location, format (e.g. Steamroller, Iron Gauntlet), points level, player count.
- **Player** — Longshanks player id and name.
- **Participation** — a player in an event: final rank, tournament points, tiebreakers (SOS, Control Points, Army Points), and one or more submitted lists.
- **ArmyList** — the raw list text as submitted plus the parsed result: faction, army (theme / Army list), caster, points, and list entries (model or unit, size, attachments, points).
- **Game** — round, both participants, result, which of each player's lists was played (if known), scenario, Control Points and Army Points.

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
- `npm run test:int` — integration tests with TestContainers (needs Docker).
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
- **Domain areas** (`src/domain/`): `database`, `longshanks` (client, login, HTML parsing), `imports` (scheduling and running imports), `lists` (list parser and normalization), `events`, `players`, `statistics`.
- **Database**: TypeORM + Postgres. Entities in `src/domain/database/entities/`, migrations in `src/domain/database/migrations/` — migrations are explicitly registered in `app.module.ts`, so new migrations must be added there.
- Statistics are computed by query handlers. If they become slow, add materialized aggregates that the import refreshes — do not hand-write SQL against a specific database.

### Frontend

- Vite + React 18, TypeScript, Tailwind 4 + daisyUI. Server state via @tanstack/react-query, client state via zustand, forms via react-hook-form + yup, charts via recharts.
- All backend calls go through the generated client in `src/api/generated/` — never hand-write fetch calls to the backend.
- Pages in `src/pages/` (events/, lists/, statistics/); shared components in `src/components/`.
- Backend URL configured via `VITE_SERVER_URL` in `.env`.

## Coding Guidelines

* Always run linting after code generation to fix formatting issues.
* Always use IsEnum, not IsIn to make it consistent.
* Always use named constants for magic numbers.
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
* Only write comments to explain the why, not what the code does.
* Rely on prettier for formatting.
* Reuse TestContainers when possible, do not spin them up for every single test.
* Use a fromDomain method for response-dtos. Do not construct the dtos in the constructor.
* Use daisy-UI components as much as possible.
* Use spread operators and simplifications for mappings.
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
