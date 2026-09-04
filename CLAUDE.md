@AGENTS.md

# Mission Quest — working notes

- Read `docs/phase-1-architecture.md` (data model, day/streak rules, permissions) and `docs/phase-2-design.md` (tokens, components, copy) before changing behaviour or UI. Update them when you deviate.
- Every daily fact is keyed by `localDate` ("YYYY-MM-DD") in the **family's** timezone. Never use `new Date()` dates for "today"; use `todayLocal(ctx.timezone)`.
- Points are an append-only ledger (`PointTransaction`). Never update/delete rows; reverse with a new row. `ChildStats` and `DailyProgress` are caches: call `recomputeDailyProgress` + `recomputeChildStats` after any change to instances or the ledger.
- Every Server Action / Route Handler starts with `requireParentAction()` / `requireChildAction()`; every query is scoped by `familyId` (and `childId` for children). Client-provided ids are looked up with the family predicate before use.
- Child-facing copy never uses: fail, lose, behind, lazy, wrong, penalty, expired, reject. See `src/lib/domain/copy.ts`.
- Domain logic in `src/lib/domain/` is pure and unit-tested (`npm test`). Services in `src/lib/services/` compose the database with the domain. Pages read through `src/lib/data/` DTO builders.
- Local database: `npm run db:start` (embedded Postgres on 5433). Demo data: `npm run db:reset-demo`. Seeds run under Node's `react-server` condition so the `server-only` marker resolves to an empty module.
- Icons: task/reward icons are emoji by product decision; UI icons are inline SVG.
