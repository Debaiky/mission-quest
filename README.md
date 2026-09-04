# Mission Quest

A game-like missions app for families: parents create missions, approve them and define rewards; children build streaks, earn points and XP, level up through a world map and unlock cosmetics.

- **Product & technical architecture:** [docs/phase-1-architecture.md](docs/phase-1-architecture.md)
- **Design system, screens, copy and celebrations:** [docs/phase-2-design.md](docs/phase-2-design.md)
- **Mockups:** `docs/design-canvas/*.dc.html` (source for the design canvas)

## Stack

Next.js (App Router, Server Components, Server Actions) · TypeScript · Tailwind CSS v4 · Prisma 7 + PostgreSQL · Motion · Zod · web-push · Resend. Own session auth (Argon2id, database sessions, HttpOnly cookies). Deploys to Vercel with an hourly cron.

## Local development

```bash
npm install
npm run db:start        # starts an embedded Postgres on port 5433 (data in ./.pg, git-ignored)
npx prisma migrate dev  # applies migrations
npm run db:seed         # system data + demo family (DEMO_SEED=true in .env)
npm run dev             # http://localhost:3000
```

`.env` is pre-filled for local development (`DATABASE_URL` points at the embedded Postgres). Copy `.env.example` when configuring another environment.

### Demo accounts

| Who | Where | Credentials |
|---|---|---|
| Parent | `/login` | `demo@missionquest.app` / `demo-parent-2026` |
| Alex, Maya, Leo | `/kid/login` | family code `SUNNY-FOX-42`, PINs `1111`, `2222`, `3333` |

`npm run db:reset-demo` deletes and recreates the demo family with fresh history. `npm run db:reset-demo -- --remove-only` removes it.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` · `npm test` | TypeScript · ESLint · Vitest: unit tests for the domain (dates, schedules, day progress, streaks, levels, achievements) and integration tests against the local database (approvals, ledger, day close, rollover, overdue missions, rewards, cross-family authorization) |
| `npm run test:e2e` | Playwright end-to-end tests (parent login and approvals, quick-add, child family-code login). Needs the dev server or starts one, plus the demo family (`npm run db:seed`). First run: `npx playwright install chromium` |
| `npm run db:start` / `db:stop` | Embedded Postgres for local dev |
| `npm run db:migrate` / `db:deploy` / `db:generate` / `db:studio` | Prisma |
| `npm run db:seed` / `db:reset-demo` | Seed system data and the demo family |

## How the day works

Every daily fact is keyed by a `localDate` (`YYYY-MM-DD`) in the **family's** timezone. Missions are materialised per child per day from tasks; at family midnight a day is *closed*: pending missions expire, roll over once, or persist per the task's policy; the perfect-day bonus is paid; streaks and achievements are recomputed. Closing runs from the hourly cron **and** lazily on the next read, so correctness never depends on the cron. Points are an append-only ledger; balance, XP, level and streaks are caches rebuilt from history.

Definitions live in `src/lib/domain/` (pure, unit-tested) and are wired up in `src/lib/services/`.

## Deploying to Vercel

1. Create a Postgres database (Neon via the Vercel Marketplace works well). Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in the project's environment variables.
2. Set `SESSION_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, and optionally `RESEND_API_KEY` + `EMAIL_FROM` (email) and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` (push; generate with `npx web-push generate-vapid-keys`). Leave `DEMO_SEED` unset in production.
3. The build command is `prisma generate && prisma migrate deploy && next build` (already in `package.json`). Seed system data once with `npx prisma db seed` against the production database (with `DEMO_SEED` unset it creates only categories, levels, achievements and cosmetics).
4. `vercel.json` schedules `/api/cron/tick` hourly. On the Hobby plan crons run at most daily; the app stays correct, but reminders are only timely if you also ping `GET /api/cron/tick` with `Authorization: Bearer $CRON_SECRET` from an external scheduler.

## Project layout

```
prisma/           schema, migrations, seed (system data + demo family)
src/app/          (public) landing & logins · (child)/kid/* · (parent)/parent/* · api/cron, api/push
src/actions/      Server Actions (auth, missions, approvals, tasks, children, rewards, reminders, settings, onboarding)
src/lib/auth/     sessions, passwords, rate limiting, family codes, require* guards
src/lib/domain/   pure logic: dates, schedule, progress, streaks, levels, achievements, copy, starter packs
src/lib/services/ ledger, stats, materialize, day-close, missions, approvals, rewards, tasks, reminders, celebrations
src/lib/notifications/ service + outbox dispatch + channels (push, email)
src/lib/data/     read models (DTOs) for pages
src/components/   ui primitives · child/ · parent/ · celebrations/ · shared/
tests/            Vitest unit tests
```
