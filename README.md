# Salone Vibes (Get Am Nice)

**Your cultural plug to Salone music, slang, and lifestyle.**

Salone Vibes is a mobile-first web app for fans of Sierra Leonean (Salone) music. Look up Krio words and phrases, build your personal lexicon, discover live events, and explore artists—all in one place.

Built because no existing platform serves this community well, and because Famous dropped "One Life" and someone needed to know what *fen am* meant.

**Live app:** Deploy on **Railway**; add your public URL here when you have one.

**Full story:** *(link to blog post when published)*

---

## Features

Everything below is **implemented** in the repo unless marked *planned*.

### Culture & discovery (mostly public)

| Area | What’s live |
| --- | --- |
| **Home** | Word of the Day, upcoming events preview, links into dictionary / events / artists. Signed-out hero (“Get Am Nice.”); signed-in welcome strip. |
| **Salone Dictionary** | AI-assisted lookup (definition, cultural context, pronunciation, usage examples). **Lookup is public** (no account). |
| **Events** | Upcoming events grid, filter by location text. Event cards with venue, address/maps link, description, ticket link. **Browsing is public.** |
| **Artists** | Grid of artists (seeded directory + admin-added). **Artist detail** page: photo, bio, vibe tags, outbound links. **Browsing and detail are public.** |

### Personalization (sign-in required)

| Area | What’s live |
| --- | --- |
| **Save to Lexicon** | From dictionary results, save entries into *your* lexicon (after sign-in). |
| **My Stash** | One hub: **My Lexicon** (edit notes, fix AI text, delete entries), **Songs I Love** (CRUD + notes), **My Artists** (stashed artists). Signed-out visitors see a **sign-in / sign-up** prompt (feature is not hidden). |
| **Save artist to Stash** | On artist detail, stash / unstash. Signed-out users get a **sign-in** CTA. |
| **Submit an event** | Manual form + optional **flyer upload**; Claude extracts fields to pre-fill the form. **Sign-in required**; signed-out users see **sign-in** CTAs instead of the submit dialog. Submitters can edit/delete **their** events. |
| **Profile / Settings** | Display name, email/method summary, sign out. Signed-out visitors see a **sign-in** prompt. |

### Administration (Clerk role)

Users with **`publicMetadata.role === "admin"`** in Clerk (and optional server **`ADMIN_CLERK_IDS`** fallback) can:

- **Add Artist** (AI-generated bio + vibe tags from name).
- **Edit** artist bio, vibe tags, and links on the artist detail page.

Non-admins see read-only artist fields. The API enforces the same rules for create/update artist routes.

### Platform & quality

- **Auth:** Clerk (e.g. Google OAuth—configure providers in Clerk).
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) for dictionary, artist copy, event flyer extraction.
- **Data:** PostgreSQL + Drizzle ORM; API validated with **Zod** (from **`@workspace/api-spec`** codegen).
- **Installable:** Web app **manifest** (`standalone`) for home-screen style launch; not a full offline service-worker PWA unless you add one later.
- **AI disclaimers:** UI notes on generated content where relevant (dictionary, artists, events, etc.).

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Monorepo | **pnpm** workspaces (`artifacts/`, `lib/`) |
| Frontend | React, **Vite**, **Wouter**, **TanStack Query**, Tailwind |
| Auth | **Clerk** (React + Express middleware) |
| Backend | **Node.js**, **Express** (bundled with esbuild) |
| Database | **PostgreSQL**, **Drizzle** (`lib/db`) |
| API contracts | **OpenAPI / Orval** (`lib/api-spec`), runtime schemas **`lib/api-zod`** |
| AI | **Anthropic** Claude API |
| Hosting | **Railway** (typical: `pnpm run build`, then API `pnpm start`, `NODE_ENV=production`) |

---

## Why Salone-specific?

Krio is a creole language with its own grammar, borrowings, and cultural references, distinct from Nigerian Pidgin, Ghanaian Pidgin, and other West African creoles. Salone music is genuinely underserved by major platforms. Being specific is a feature, not a limitation.

---

## Why Claude for the dictionary?

General-purpose AI handles Krio slang inconsistently. Claude was chosen after testing showed better cultural context and nuance for Sierra Leonean music. Manual edit capability in **My Lexicon** is the safety net. AI alone is not enough for heavy slang, and human confirmation matters.

---

## Events data

Salone music events are often promoted on Instagram and in community networks, not only on big ticketing platforms. The app uses **community submission** (plus flyer scan) as the primary source rather than brittle scraping.

---

## Project status

### Tier 1 — **Shipped**

Core loop is live end-to-end: browse culture anonymously, sign in to personalize, admins can curate artists.

- Dictionary lookup + personal lexicon + AI lookup pipeline  
- Events listing, filter, submit, flyer extraction, submitter/admin edit & delete  
- Artist directory, detail pages, stash artist, admin-only artist CRUD (UI + API)  
- My Stash (lexicon, songs, artists)  
- Home experience (word of day, events preview)  
- Profile / settings  
- Clerk authentication and **public vs authenticated** UX (sign-in prompts where needed)  
- Shared library packages (db, api-zod, api-spec codegen, React API client)  
- Production-oriented API serving built static frontend when configured  

### Tier 2 — **Planned / not started**

These are the next product milestones; they are **not** in the app yet (e.g. no `/events/:id` route today).

- Dedicated **event detail** pages / shareable URLs  
- **Artist ↔ event** relationships (lineups, promoted shows)  
- **YouTube** (or other) playback / embed integration  
- **Community interpretations** (e.g. collaborative notes on slang or lyrics)  

### Longer term

- Whole-song translations (collaborative, human-confirmed)  
- Timestamp-linked lyrics  

---

## Artist seed list

Famous, Emmerson, Rozzy Sokota, Arkman, Dallas Bantan, Camouflage, King Boss LA, King Melody, Jimmy B, Pretty S, Willie Jay, Drizilik

---

## Local development

**Requirements:** Node.js (LTS), **pnpm** `10.33.0` (see root `package.json`), PostgreSQL, Clerk app + Anthropic API key for full AI features.

1. **Clone** and install from repo root:

   ```bash
   pnpm install
   ```

2. **Environment:** Create a **`.env` at the repo root** (used by the API and loaded by Vite for prefixed vars). Typical variables include:

   - `DATABASE_URL` — PostgreSQL connection string  
   - `CLERK_SECRET_KEY` — Clerk backend  
   - `VITE_CLERK_PUBLISHABLE_KEY` — Clerk frontend  
   - `VITE_CLERK_PROXY_URL` — optional Clerk proxy  
   - `ANTHROPIC_API_KEY` — dictionary, artists, flyer extraction  
   - `PORT` — API port (frontend dev often proxies `/api` to this, default `3000`)  
   - `ADMIN_CLERK_IDS` — optional comma-separated Clerk user IDs for admin fallback  
   - `FRONTEND_STATIC_DIR` — optional; use when production static files are not in the default layout  

3. **Run DB migrations** as documented in `lib/db` (if applicable to your setup).

4. **Dev (API + Vite together)** from repo root:

   ```bash
   pnpm dev:local
   ```

   - Frontend: **http://localhost:5173** (proxies `/api` to the API)  
   - API: port from **`PORT`** in `.env`  

5. **Quality gates** (also used in CI-style workflows):

   ```bash
   pnpm run typecheck
   pnpm run build
   ```

6. **OpenAPI / Zod codegen** (when you change the spec):

   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```

   Keep **`lib/api-zod/src/index.ts`** hand-maintained per project conventions (export only what the app needs from generated code).

---

## About

Built by [Boomie Odumade](https://techbees.me) as part of the [Building Out Loud with AI](https://techbees.me/blog/building-out-loud-ai) series. TechBees provides fractional CTO and VP Engineering services and AI literacy education.

[Website](https://techbees.me) | [LinkedIn](https://linkedin.com/in/odumade) | [Speaking](https://sessionize.com/boomie)
