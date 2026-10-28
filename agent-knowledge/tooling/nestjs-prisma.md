# NestJS + Prisma 7 — tooling notes

Established in the StocksDashboard project (2026-06-20 / 2026-06-21).
Stack: NestJS 11, Prisma 7, SQLite via better-sqlite3 adapter, Node 24.

This file captures the reusable *patterns*, not the one-time debug steps of the scaffold (driver
adapter, CJS module format, ESM `.js` import resolution, RNTL async render, jest version split).

---

## e2e tests: skip Prisma CLI, use `better-sqlite3` + inline SQL

For Supertest e2e tests against a real SQLite DB, do **not** use the Prisma CLI
(`prisma migrate deploy`) to set up the test database. It's slow, requires the full
migration history on the PATH, and couples the test runner to the dev environment.

**Pattern:**

1. `npm i -D better-sqlite3 @types/better-sqlite3`
2. In e2e test global setup, open the DB with `better-sqlite3` directly and run the
   schema DDL inline (just the `CREATE TABLE` statements from your migration SQL).
3. Configure `PrismaService` to point to the test DB via the `adapter` constructor.

Benefits: fast (< 1s setup), self-contained, no migration CLI dependency, works in CI
without any additional setup steps beyond `npm ci`.

---

## `--experimental-vm-modules` for Prisma 7 WASM in Jest

Prisma 7 ships a WASM query engine. Jest 30 (NestJS default) cannot load WASM modules
without experimental VM module support.

Add to the e2e test script in `backend/package.json`:

```json
"test:e2e": "node --experimental-vm-modules node_modules/.bin/jest --config jest-e2e.json --forceExit"
```

Add to CI `test` job (after unit tests):

```yaml
- name: Backend e2e tests
  run: npm run test:e2e -w backend
```

Note: this flag is **only needed for e2e tests** that actually instantiate the Prisma
client with the WASM engine. Unit tests that mock `PrismaService` don't need it.

---

## Prisma `groupBy()` cannot use date functions — use `$queryRaw`

`prisma.model.groupBy({ by: [...] })` only accepts literal field names as group keys.
SQLite date-extraction functions like `strftime('%Y-%m-%d', publishedAt)` cannot be used
as group-by keys through the Prisma client (open issues #6653, #24169).

**Pattern:** Use `$queryRaw<T[]>` with an explicit TypeScript interface:

```typescript
interface DateBucketRow {
  // why: $queryRaw returns unknown; explicit interface required by strict TS
  date: string;
  count: bigint;
}

const rows = await this.prisma.$queryRaw<DateBucketRow[]>`
  SELECT strftime('%Y-%m-%d', publishedAt) AS date, COUNT(*) AS count
  FROM NewsItem
  WHERE stockId = ${stockId}
  GROUP BY date
  ORDER BY date DESC
`;
// why: SQLite-specific; use DATE_TRUNC('day', "publishedAt") for PostgreSQL
```

**Node.js bigint:** SQLite returns `SUM()` and `COUNT()` results as `bigint` in Node.js
via `$queryRaw`. Always wrap with `Number()` when mapping to `number`-typed fields.

**PostgreSQL migration:** Replace `strftime('%Y-%m-%d', field)` with
`DATE_TRUNC('day', "field")`. Add the `// why:` comment on the SQLite version so the
migration path is easy to find.

⏳ Verify after: 2027-06 — check Prisma issues #6653 / #24169; `groupBy` with date
functions may be natively supported in a future Prisma release.

---

## CI step order

The rule is `anti-patterns.md` #11 (generate before `tsc`). Specific to this stack: a
`build:shared` step sits between `prisma generate` and `tsc`, and the generated client at
`src/generated/prisma/` is gitignored, so CI regenerates it on every run.
