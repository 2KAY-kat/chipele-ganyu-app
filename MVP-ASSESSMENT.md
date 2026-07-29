# MVP Assessment — Chipeleganyu Online Cooperative

**Date:** July 28, 2026
**Project:** USSD-based savings cooperative platform (simulated)
**Status:** MVP-ready with recommended fixes

---

## 1. Executive Summary

The app simulates a USSD-based rotating savings cooperative where members register, join fixed-tier savings circles, contribute each cycle, and receive automatic rotating payouts — all through a browser-based phone simulator that mimics a real feature-phone USSD experience.

**Verdict: PRESENTABLE after fixing 3 critical issues.** The core value proposition is demonstrable and the simulation is visually compelling. The state machine for the USSD flow (register → login → contribute → payout cycle) is fully functional. However, a port mismatch will cause a failed demo on stage, and some documentation inaccuracies create confusion.

---

## 2. What Works Well (Strengths)

### Core USSD Flow (fully implemented)
- **Registration** — collects name, national ID, mobile money number, PIN; generates Member ID
- **Login** — validates member ID + PIN via bcrypt
- **Make Contribution** — selects circle, confirms, records payment, auto-triggers payout when cycle completes
- **Check Balance** — shows contribution, disbursement, and fee wallet balances
- **Check Cycle Status** — shows cycle number, member count, payments received, next payout recipient
- **Join a Circle** — lists all 5 circles, validates no duplicate membership, assigns payout order
- **Help menu** — static info pages
- **Logout** — terminates session cleanly

### Payout Logic
- When all members in a circle have contributed for the current cycle, the pooled amount is automatically disbursed to the next member in rotation order (cyclic). This is the key feature investors want to see — **it works**.

### Phone Simulator (Frontend)
- Realistic phone frame with notch, status bar, green-on-black USSD screen
- Correctly models the USSD `*`-delimited input chain
- Session log panel provides transparency into the conversation
- End-of-session detection and "Dial Again" flow

### Backend Architecture
- Clean service layer separation (session, member, circle, wallet services)
- Well-defined Drizzle ORM schema with proper foreign keys
- 5 default circles auto-created on startup — zero manual setup
- SQLite requires no database server, excellent for demo portability

---

## 3. Critical Issues (Fix Before Demo)

### 3.1 Port Mismatch (WILL BREAK DEMO)
| Where | Value |
|---|---|
| Frontend `App.tsx:3` | `http://localhost:5001/api/ussd` |
| Backend fallback `index.ts:12` | `process.env.PORT \|\| 5000` |
| Backend `.env` | `PORT=5001` |

The backend `.env` sets `PORT=5001` which matches the frontend — **this currently works as long as `.env` is present**. However, the fallback to `5000` in `index.ts` creates a fragile setup: if `.env` is missing or not loaded, the demo silently breaks. Fix the fallback to match.

### 3.2 Duplicate National ID Crashes Registration
`handleRegisterPin` in `ussdController.ts:141-147` calls `createMember` without checking for existing `national_id`. The SQLite UNIQUE constraint throws, the catch block returns a generic `"END Something went wrong"` with no detail. User has no idea what happened.

### 3.3 Documentation Contradictions
- `AGENTS.md:5` says "MongoDB" — actual is SQLite
- `AGENTS.md:17` says backend runs on `:5000` — actual is `:5001`
- `README.md:33` says `npm run install all` — actual command is `npm run install:all`

---

## 4. Issues to Fix (Medium Priority)

### Dead Code
| File | Issue |
|---|---|
| `ussdbnd/src/config/env.ts` | Empty file, zero lines |
| `ussdbnd/src/utils/pinHasher.ts` | Empty stub, hashing is done in memberService.ts |
| `ussdc/src/App.css` | 184 lines of unused Vite boilerplate (all styling is Tailwind) |
| `ussdc/src/assets/react.svg` | Unused Vite scaffold asset |
| `ussdc/src/assets/vite.svg` | Unused Vite scaffold asset |
| `ussdc/src/assets/hero.png` | Unused Vite scaffold asset |

### Unused Dependencies
| Package | Location | Why Remove |
|---|---|---|
| `bcryptjs` | `ussdbnd/package.json` | `bcrypt` (native) is used instead |
| `all` | Root `package.json` | No-op empty package, likely from typo'd install |

### Brittle Seed Script
`ussdbnd/src/scripts/seed.ts` hardcodes `MEM001` and fails if not found. `ensureDefaultCircles()` already creates circles on startup, making the seed script redundant for most use cases.

### UX Polish
- Frontend input field has no `inputMode` — should suggest numeric keypad on mobile
- Error messages for DB constraint violations are generic — user gets no guidance
- `session.data` uses `any` type — fragile property access throughout the controller

---

## 5. Nice-to-Have (Post-MVP)

| Feature | Why |
|---|---|
| Multi-page USSD menus | Long circle lists could exceed 160-char USSD limit |
| Contribution pending/receipt flow | Currently skips directly to "completed" |
| Fee wallet actually accruing fees | Schema supports it, nothing writes to it |
| Admin dashboard for monitoring | Real cooperative would need oversight |
| Test suite | Zero tests anywhere in the codebase |

---

## 6. Recommendations

### Before Any Demo (Critical)
1. Fix backend `PORT` fallback to `5001` in `index.ts`
2. Add duplicate `national_id` catch in registration
3. Correct `AGENTS.md` to reflect SQLite + port 5001

### Before Investor Presentation (Recommended)
4. Remove dead files and unused dependencies
5. Fix README install command typo
6. Add `inputMode="numeric"` to frontend input
7. Verify end-to-end flow works with `npm run dev` from clean state

### Post-MVP Roadmap Suggestions
- Admin dashboard for monitoring circles and members
- Real mobile money integration (replace simulated wallets)
- SMS notifications for payout events
- Multi-language support (Chichewa/English)

---

## 7. Architecture Overview

```
Frontend (ussdc/)                     Backend (ussdbnd/)
┌─────────────────┐                  ┌──────────────────────────┐
│  Phone Simulator │  POST /api/ussd  │  ussdController.ts       │
│  (App.tsx)       │ ──────────────> │  ├─ routeStep()           │
│                  │ <────────────── │  │  └─ 13 step handlers   │
│  inputChain[]    │  CON/END text   │  ├─ sessionService.ts     │
│  joined by *     │                  │  │  └─ Map (3min TTL)    │
│                  │                  │  ├─ memberService.ts     │
│  Screen: <pre>   │                  │  ├─ circleService.ts     │
│  green-on-black  │                  │  ├─ walletService.ts     │
│                  │                  │  └─ db/ ── schema.ts     │
│  Session Log     │                  │       └─ SQLite (Drizzle)│
└─────────────────┘                  └──────────────────────────┘
```

### Data Model (5 tables)

```
members ──< circle_members >── circles
  │                                │
  └────< contributions >───────────┘
  │
  └──── wallet_transactions
```

### USSD State Machine

```
WELCOME ──1──> REGISTER_NAME ──> REGISTER_NATIONAL_ID ──> REGISTER_MOBILE_MONEY ──> REGISTER_PIN ──> END
    │
    └──2──> LOGIN_MEMBER_ID ──> LOGIN_PIN ──> MAIN_MENU
                                                 │
                                           ┌─────┼─────┬─────┬─────┐
                                           1     2     3     4     5
                                           │     │     │     │     │
                                      SELECT_C  BALANCE STATUS JOIN_C  HELP
                                           │     (END)   (END)  (END)  │
                                      CONFIRM                         └──0──> MAIN_MENU
                                      (END)
```

---

## 8. File Inventory

| File | Lines | Purpose |
|---|---|---|
| `ussdbnd/src/index.ts` | 28 | Express server entry |
| `ussdbnd/src/config/db.ts` | 48 | SQLite + Drizzle setup |
| `ussdbnd/src/config/env.ts` | **0** | DEAD — delete |
| `ussdbnd/src/db/schema.ts` | 80 | Drizzle table definitions |
| `ussdbnd/src/routes/ussdRoutes.ts` | 8 | POST /ussd route |
| `ussdbnd/src/controllers/ussdController.ts` | 446 | USSD state machine + all handlers |
| `ussdbnd/src/services/sessionService.ts` | 62 | In-memory session store |
| `ussdbnd/src/services/memberService.ts` | 47 | Member CRUD |
| `ussdbnd/src/services/circleService.ts` | 179 | Circle operations + payout logic |
| `ussdbnd/src/services/walletService.ts` | 16 | Wallet balance queries |
| `ussdbnd/src/utils/referenceGenerator.ts` | 27 | Member ID + reference ID gen |
| `ussdbnd/src/utils/pinHasher.ts` | **0** | DEAD — delete |
| `ussdbnd/src/scripts/seed.ts` | 38 | Brittle seed (mostly redundant) |
| `ussdc/src/main.tsx` | 9 | React entry point |
| `ussdc/src/App.tsx` | 197 | Monolithic simulator component |
| `ussdc/src/App.css` | **184** | DEAD — delete (unused Vite boilerplate) |
| `ussdc/src/index.css` | 3 | Tailwind directives |
| `AGENTS.md` | 43 | Internal orchestrator notes |
| `README.md` | 82 | Project documentation |
| `Root package.json` | 19 | Monorepo scripts |

---

## 9. Quick Fix Checklist (for the developer)

```bash
# 1. Fix backend port fallback
# 2. Catch duplicate national_id in registration
# 3. Correct AGENTS.md
# 4. Delete dead files
# 5. Remove unused deps
# 6. Fix README typo
# 7. Add inputMode to frontend
# 8. Run npm run dev and test end-to-end
```

Estimated effort: **< 1 hour** for all critical and medium-priority fixes.
