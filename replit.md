# Get Am Nice — Salone Cultural Companion App

## Overview

"Get Am Nice" is a mobile-first web app for Salone (Sierra Leonean) music fans. It helps users look up Krio words and phrases, discover Salone music events, and explore artists — all in a celebratory, culturally rich experience.

Visual direction: Sierra Leone flag palette (deep green, cobalt blue, white, warm gold accent). Bold typography, celebratory party energy, not corporate.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/get-am-nice)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Clerk (Google sign-in enabled)
- **AI**: Anthropic Claude (via `ANTHROPIC_API_KEY` secret) for dictionary lookups
- **Build**: esbuild (CJS bundle)

## Features (Day 1)

- **Home** — Featured Salone term of the day + upcoming events preview
- **Dictionary** — AI-powered Krio/Salone word lookup (Claude); save/edit/delete lexicon entries
- **Artists** — Coming soon placeholder
- **Events** — Browse upcoming Salone music events by location; submit new events
- **Profile** — User profile, settings, sign out

## Navigation

- Top nav bar with four tabs: Home, Dictionary, Artists, Events
- Profile/settings icon in the top right corner of the nav (not a tab)
- PWA-enabled: installable to mobile home screen

## Database Schema

- `users` — Clerk-linked user profiles
- `lexicon_entries` — User's saved dictionary entries
- `events` — Salone music events (pre-seeded with 5 events)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/get-am-nice run dev` — run frontend locally

## Environment Variables / Secrets

- `ANTHROPIC_API_KEY` — User's own Anthropic API key for dictionary lookups
- `CLERK_SECRET_KEY` — Auto-provisioned by Clerk
- `CLERK_PUBLISHABLE_KEY` — Auto-provisioned by Clerk
- `VITE_CLERK_PUBLISHABLE_KEY` — Auto-provisioned by Clerk
- `DATABASE_URL`, `PG*` — Auto-provisioned PostgreSQL connection

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
