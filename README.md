# arduino_weather

Turborepo monorepo: Next.js 15 (App Router) + Hono API at **`GET /api`**, Open-Meteo forecast for **Przemyśl** (Subcarpathian Voivodeship, Poland): **today + next 7 days** (8 daily rows).

**Device client:** The stack is meant for an **Arduino board with an LCD** to poll the forecast over HTTP (**`GET /api`** on your deployed base URL, or locally while developing), parse the JSON, and render values on the screen. The web app in `apps/web` is an extra way to view the same data in a browser.

## Structure

- `apps/web` — Next.js UI, `app/api/[[...route]]` + `hono/vercel`, Edge `middleware` (rate limit)
- `packages/weather-core` — Open-Meteo client, Zod contract
- `packages/api` — Hono app (`createApiApp`), shared with tests

## Scripts (repository root)

```bash
npm install
npm run dev      # turbo dev — Next on :3000
npm run build
npm test
npm run lint
```

## Environment (Vercel / local)

Rate limiting uses **Upstash Redis** (optional). If unset, requests are not application-limited (still behind Vercel edge protections).

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Vercel

Deployments are driven by **Vercel’s Git integration**: pushes to the **production branch** (typically `main`) trigger a production build and deploy. You do **not** need GitHub Actions or `vercel deploy` in CI for that.

1. Create a project **from this GitHub repository** and authorize the Vercel GitHub app.
2. Under **Settings → Git**, set **Production Branch** to `main` (or your production branch).
3. Set **Root Directory** to `apps/web`.
4. For the monorepo, enable **Include source files outside of the Root Directory in the Build Step**, or rely on `apps/web/vercel.json` `installCommand` / `buildCommand` that run from the repo root.
5. Under **Settings → Environment Variables**, add the Upstash vars from the section above for **Production** (and **Preview** if you want rate limits on preview URLs too).

## API contract

`GET /api` returns JSON: `location`, `days` (length **8**), `meta` (`forecastDays: 8`, `timezone`, `source: "open-meteo"`, `fetchedAt`).

## Stack notes

- No Express — HTTP via **Hono** + Next route handlers.
- **Jest** + **Supertest** (`@repo/api`), unit tests (`@repo/weather-core`).
- TypeScript path aliases: `@repo/*` (see each package `tsconfig.json` / `apps/web`).
