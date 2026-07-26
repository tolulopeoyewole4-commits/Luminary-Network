# Contributing

## Milestone workflow

1. Branch from the previous milestone tip using `cursor/<descriptive-name>-c4ad`.
2. Keep changes small and testable; update `CHANGELOG.md` / `AGENTS.md` when a milestone completes.
3. Run `pnpm gate` before opening or updating a PR.
4. Prefer draft PRs stacked on the previous milestone branch (see `docs/release-checklist.md`).

## Local checks

```bash
pnpm gate
pnpm sql:bundle
pnpm smoke:local
```

## Security

- Never commit `.env` files or service-role keys.
- Browser bundles may only use `NEXT_PUBLIC_*` values.
- Keep RLS enabled on every user-owned table.
- Ask before enabling paid AI providers or avatar generation.
