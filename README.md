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
npm run crawl -- --from 2025-01-01 --parallel 3 # import 3 events at once
npm run crawl -- --reparse                     # re-parse everything from stored pages, no downloads
npm run crawl -- --catalog                     # load factions, armies and models from the wiki into the catalog file and import it
npm run crawl -- --catalog --reparse           # the same, then re-parse all lists against the new catalog
npm run crawl -- --shop                        # import the products of the shop and calculate the price of every list
npm run prune                                  # drop all tables to start from scratch (including the page cache)
```

Then start the app. Besides factions and lists there are pages for players and events, every table can be sorted, and most can be searched.

Start it with:

```bash
npm run dev             # from the repo root: Postgres, backend and frontend
```

Open http://localhost:5173. The API docs are at http://localhost:3000/api.

## How the crawler works

- Longshanks has no API, so the crawler reads the same HTML the event page loads. No login is needed.
- It sends at most 2 requests at a time with at least one second between them (`LONGSHANKS_MAX_CONCURRENT_REQUESTS`, `LONGSHANKS_REQUEST_DELAY_MS`) and imports 2 events in parallel (`CRAWLER_EVENT_CONCURRENCY`). A first crawl of a whole year takes a few hours, that is expected. Please keep the limits low, Longshanks is a hobby project.
- Only finished events are imported. Re-importing an event replaces its data.
- Every downloaded page is stored in the `pages` table. If the list parser improves, run `npm run crawl -- --reparse`: all events are parsed again from the stored pages without downloading anything. Use `--refresh` to force a download.
- When you change the parser, the model matching or how armies are assigned, increase `PARSER_VERSION` in `backend/src/domain/imports/parser-version.ts`. After a deployment the backend notices the new version on startup and re-parses all events in the background, so there is nothing to run by hand. The same happens when `catalog.json` changed: it is imported on startup and all events are re-parsed. The site stays online meanwhile.
- Importing an event again is safe: its data is replaced in one transaction and list IDs stay the same, so links keep working.
- Games are linked to the list that was played by comparing the leader Longshanks shows for the game with the caster of each list. If a player submitted only one list, that list is used.

To keep the database up to date while the backend runs, set a schedule in `backend/.env`:

```bash
CRAWLER_SCHEDULE=0 4 * * *      # every day at 04:00
CRAWLER_LOOKBACK_DAYS=14        # check the last two weeks for new events
```

## Models from the wiki

Factions, armies and models come from the army indexes of the [Warmachine Academy wiki](https://warmachineacademy.miraheze.org/wiki/Main_Page) (the footer at the end of each army page). `npm run crawl -- --catalog` loads them, writes them to `backend/src/domain/catalog/catalog.json`, and imports them; add `--reparse` to match all lists against the new catalog. Run it again whenever the wiki changes and commit the file. When the backend or the crawler starts, the catalog file is imported automatically if the database does not have it yet.

Only armies that have an index in the wiki are analyzed. Lists of other armies (e.g. Legacy armies) are not stored, and players of those armies show up without an army.

Every list entry is matched to a model of its army: exact names first, then names without numbers, then small spelling errors (edit distance, more typos allowed for longer names). Entries that match no model are kept with their name as written and shown as "Other". Equipment and weapons of warjacks and warbeasts never match and are hidden with "Show equipment".

## Prices from the shop

`npm run crawl -- --shop` reads all products of the official shop [warmachine.gg](https://warmachine.gg) from its product feed in the configured currency (`SHOP_CURRENCY`, default EUR). The models of a product come from the "What's in the box?" (or "What's included?") section of the description, from lines with a model type like "(Unit)" when there is no such section, or from the title for single kits. They are matched to the models of the wiki with the same matching as list entries, using the army tags of the product. Shortened names are matched as well, e.g. "Southern Kriels Kithguard Medics" or "Gunmages", but only when exactly one model of the army fits. Chassis variants are skipped, they come without weapons and heads. Kits that build one of several models, e.g. "Crucible Guard Toro/Suppressor/Vindicator Warjack" or the "Build options" of a box, count as one of them: a list with a Toro and a Suppressor needs two kits.

The price of a list is the cheapest combination of products that contains every model of the list, calculated as an integer program with the HiGHS solver. A box can be cheaper than the single kits, and products are bought several times when a list needs a model more often. Models the shop does not sell are shown below the products and are not part of the price. Prices are calculated again after every shop import and event import, the scheduled crawl imports the shop as well.

## Reading the numbers

- **Win rate** counts a draw as half a win. Byes and mirror matches are left out.
- Every percentage shows how many games or lists it is based on. Win rates from fewer than 10 games are faded.
- **Win rate when played** for a unit only counts games where the list containing that unit was played.

## Docker image and deployment

Every push to `main` runs the integration tests and builds the image (lint, build and unit tests run inside the `Dockerfile`). It is published to the GitHub Container Registry as `ghcr.io/<owner>/<repository>` with the tags `latest`, the build number and the commit. Pull requests only build the image.

`dev/docker-compose.yml` runs the published image together with Postgres:

```bash
cd dev
docker compose up -d                          # Postgres and the analyzer on http://localhost:3100
docker compose --profile autoupdate up -d     # also starts Watchtower, which updates the analyzer to the latest image
ANALYZER_DOMAIN=analyzer.example.com docker compose --profile proxy --profile autoupdate up -d   # also starts Caddy with HTTPS on that domain
docker compose exec analyzer node dist/crawl.js --from 2026-01-01   # crawl inside the container
```

The analyzer crawls new events every day at 04:00 (`CRAWLER_SCHEDULE`). Set `ANALYZER_IMAGE` when the repository has another name than `SebastianStehle/warmachine-analyzer`. Watchtower checks for a new image every 5 minutes and only updates containers with the `com.centurylinklabs.watchtower.enable` label, never Postgres. If the package on GitHub is private, run `docker login ghcr.io` with a personal access token (scope `read:packages`) on the host first.

The `proxy` profile runs [squidex/caddy-proxy](https://hub.docker.com/r/squidex/caddy-proxy) like in pangostack: Caddy gets a Let's Encrypt certificate for `ANALYZER_DOMAIN` and forwards to the analyzer. The domain must point to the host and ports 80 and 443 must be open. Put `ANALYZER_DOMAIN` into `dev/.env` so you do not have to pass it every time.

## Development

See [CLAUDE.md](CLAUDE.md) for the architecture, the Longshanks endpoints and the coding guidelines.

```bash
cd backend
npm test                # unit tests (parsers)
npm run test:int        # integration tests, needs Docker (or TEST_DB_URL pointing to a Postgres server)
npm run lint
```
