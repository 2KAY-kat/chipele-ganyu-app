# AGENTS.md — DEMO-USSD

## Monorepo layout

- `ussdbnd/` — backend (Express + TypeScript + MongoDB, CommonJS)
- `ussdc/` — frontend (React + Vite + Tailwind, ESM)

## Entrypoints

- Backend: `ussdbnd/src/index.ts` — Express app, connects to MongoDB, seeds default circles on startup
- Frontend: `ussdc/src/main.tsx` — Vite React app, USSD phone simulator

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start both backend (`:5000`) and frontend (`:5173`) via concurrently |
| `npm run dev:backend` | Backend only (uses `tsx watch`, no compile step) |
| `npm run dev:client` | Frontend only (`vite`) |
| `npm run install:all` | Install deps in both packages |
| `npm run seed` | Run `ussdbnd/src/scripts/seed.ts` |

## Setup gotchas

- Dependencies and `.env` are already set up — do **not** reinstall or re-run env setup.
- README says `npm run install all` (typo) — the real command is `npm run install:all`.
- Backend `.env` must have `DATABASE_URL` and `PORT`. See `ussdbnd/.env.example`.

## Backend quirks

- No build step needed — `tsx watch` runs `.ts` directly.
- No lint or typecheck scripts in backend `package.json`.
- USSD sessions are in-memory with short TTL (mimics real USSD behavior).
- Five savings circles (Circle A–E) created automatically on startup — no manual seeding required.

## Frontend quirks

- Lint: `npm run lint --prefix ussdc` (uses ESLint flat config).
- Build: `tsc -b && vite build` — includes TypeScript type-checking.

## Testing

No test scripts found in any `package.json`.