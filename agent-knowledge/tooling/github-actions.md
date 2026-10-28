# GitHub Actions — CI best practices

Established on the Buli Tippspiel project (2026-06-16, `/github-action-builder`).
Applies to any Node.js / TypeScript CI setup.

---

## Job dependency gates (`needs:`)

Add `needs: [upstream-job]` to expensive downstream jobs (Docker builds, deploys) so they
don't run when tests or type-checks already failed. Saves runner minutes and avoids a
misleading "build passed" badge when tests are red.

```yaml
docker-build:
  # why: no point building the image if backend tests already failed
  needs: [backend-ci]
```

---

## Jest `--ci` flag

Add `--ci` to every Jest invocation in CI. Without it, Jest silently updates outdated
snapshots (or lets them pass). With `--ci`, outdated snapshots fail the build loudly —
the correct CI behavior.

```yaml
# backend (NestJS / plain Node)
run: npm test -- --forceExit --ci

# frontend (Expo / React Native)
run: npm test -- --watchAll=false --forceExit --ci
```

---

## Docker layer caching (GHA cache)

Replace raw `docker build` with `docker/setup-buildx-action` + `docker/build-push-action`.
Add GHA cache to avoid re-downloading node_modules on every run (~50% speedup after first
warm cache run).

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build image
  uses: docker/build-push-action@v6
  with:
    context: backend
    push: false
    # why: GHA layer cache avoids re-downloading node_modules on every run
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

## `concurrency` — cancel stale runs

Prevents queued runs on the same branch from wasting minutes after a rapid series of pushes.

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

---

## Also read before building a workflow

- **Step order with code-gen** (generate before `tsc`): `anti-patterns.md` #11.
- **`npm ci` failing on lockfile drift**: `anti-patterns.md` #14.
