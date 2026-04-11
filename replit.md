# Get Am Nice — Salone Cultural Companion App

## Overview

"Get Am Nice" is a mobile-first web app for Salone (Sierra Leonean) music fans. It helps users look up Krio words and phrases, discover Salone music events, explore artists, and manage personal saved content — all in a celebratory, culturally rich experience.

Visual direction: Sierra Leone flag palette (deep green, cobalt blue, white, warm gold accent). Bold Clash Display typography, celebratory party energy, not corporate.

## README

A `README.md` exists at the project root with full feature and tech stack documentation. **Keep it in sync when significant features are added, changed, or removed.**

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/get-am-nice)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Auth**: Clerk (Google sign-in enabled)
- **AI**: Anthropic Claude (via `ANTHROPIC_API_KEY` secret) for dictionary lookups, bio generation, event flyer extraction
- **Build**: esbuild (CJS bundle)

## Features

- **Home** — Featured Salone term of the day + upcoming events preview
- **Dictionary** — Pure AI-powered Krio/Salone word lookup (Claude). Saves to Stash. No lexicon tab here.
- **Artists** — Browsable grid; detail page with editable bio, vibe tags, links; "Save to Stash" button on detail page; add new artists by name (Claude generates bio + tags); seeded with 12 Salone artists
- **Events** — Browse upcoming Salone music events; submit events manually or upload a flyer (Claude extracts details)
- **Stash** — Personal hub (auth required). Three sections: My Lexicon (saved Krio words), Songs I Love (personal playlist), My Artists (saved artists). Signed-out users see a sign-in prompt.
- **Settings/Profile** — Display name, account info, sign out (no longer has Songs tab — moved to Stash)

## Navigation

- Top nav bar with five tabs: Home, Dictionary, Artists, Events, Stash
- Profile/avatar in the top-right corner links to Settings page
- Mobile: icon-only top bar (5 icons, slightly smaller to fit)
- PWA-enabled: installable to mobile home screen

## Auth Pattern

`ClerkAuthBridge` component in `App.tsx` registers `setAuthTokenGetter(() => getToken())` so every API request gets a `Authorization: Bearer <token>` header. This is critical — do not remove it.

## Database Schema

- `users` — Clerk-linked user profiles
- `lexicon_entries` — User's saved dictionary entries
- `songs` — User's saved songs (Songs I Love)
- `events` — Salone music events
- `artists` — Salone music artists (name, photoUrl, bio, vibeTags[], links jsonb)
- `stashed_artists` — Join table: user ↔ artist many-to-many (unique constraint per pair)

## API Contract

All API changes go through `lib/api-spec/openapi.yaml` first, then:
1. `pnpm --filter @workspace/api-spec run codegen` — regenerate React hooks + Zod schemas
2. `cd lib/api-client-react && pnpm exec tsc --build` — rebuild declaration files so frontend sees new exports
3. `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

**Do NOT add `export * from "./generated/types"` to `lib/api-zod/src/index.ts`** — causes TS2308 duplicate export errors.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/get-am-nice run dev` — run frontend locally

## Environment Variables / Secrets

- `ANTHROPIC_API_KEY` — User's own Anthropic API key
- `CLERK_SECRET_KEY` — Auto-provisioned by Clerk
- `CLERK_PUBLISHABLE_KEY` — Auto-provisioned by Clerk
- `VITE_CLERK_PUBLISHABLE_KEY` — Auto-provisioned by Clerk
- `DATABASE_URL`, `PG*` — Auto-provisioned PostgreSQL connection

## GitHub / Version Control Note

Replit auto-commits to `main`. Changes made directly on GitHub to `main` will be overwritten by Replit's next push. Direct GitHub changes should go to a separate branch, or the user should notify the agent to pull before proceeding.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
