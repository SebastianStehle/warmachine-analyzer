# Warmachine Analyzer

Meta analysis for Warmachine (MkIV) tournaments. A crawler imports events, results, games and army lists from [Longshanks](https://warmachine.longshanks.org/) into a local Postgres database. A small web app shows:

- **Factions** — share of players, lists and win rate per army, without mirror matches.
- **Faction details** — which models and units are played, how often, and how lists containing them perform. Plus casters and matchups.
- **Lists** — every imported list, filterable by army, caster and unit, with the games it was played in.

## Quick start

You need Node.js 22 and Docker.

```bash
cp backend/.env.example backend/.env
npm run install:all     # root + backend + frontend, generates the API client
npm run dev:infra       # starts Postgres on port 5010
```

Import data with the crawler:

```bash
cd backend
npm run crawl -- --event 38573                 # a single event
npm run crawl -- --from 2026-01-01             # all events with lists since a date
npm run crawl -- --from 2026-10-01 --to 2026-10-31
npm run crawl -- --event 38573 --refresh       # download everything again
```

Then start the app:

```bash
npm run dev             # from the repo root: Postgres, backend and frontend
```

Open http://localhost:5173. The API docs are at http://localhost:3000/api.

## How the crawler works

- Longshanks has no API, so the crawler reads the same HTML the event page loads. No login is needed.
- It waits one second between requests (`LONGSHANKS_REQUEST_DELAY_MS`). A crawl of a whole year takes a while, that is expected.
- Only finished events are imported. Re-importing an event replaces its data.
- Every downloaded page is stored in the `pages` table. If the list parser improves, run the crawl again: finished events are parsed from the stored pages without downloading them again. Use `--refresh` to force a download.
- Games are linked to the list that was played by comparing the leader Longshanks shows for the game with the caster of each list. If a player submitted only one list, that list is used.

To keep the database up to date while the backend runs, set a schedule in `backend/.env`:

```bash
CRAWLER_SCHEDULE=0 4 * * *      # every day at 04:00
CRAWLER_LOOKBACK_DAYS=14        # check the last two weeks for new events
```

## Reading the numbers

- **Win rate** counts a draw as half a win. Byes and mirror matches are left out.
- Every percentage shows how many games or lists it is based on. Win rates from fewer than 10 games are faded.
- **Win rate when played** for a unit only counts games where the list containing that unit was played.

## Development

See [CLAUDE.md](CLAUDE.md) for the architecture, the Longshanks endpoints and the coding guidelines.

```bash
cd backend
npm test                # unit tests (parsers)
npm run test:int        # integration tests, needs Docker (or TEST_DB_URL pointing to a Postgres server)
npm run lint
```
