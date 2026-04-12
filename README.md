# Get Am Nice (Salone Vibes)

**Your cultural plug to Salone music, slang, and lifestyle.**

Get Am Nice is a mobile-first web app for fans of Sierra Leonean (Salone) music. Look up Krio words and phrases, build your personal lexicon, discover live events, and explore artists. All in one place.

Built because no existing platform serves this community well, and because Famous dropped "One Life" and someone needed to know what *fen am* meant. 🎵

🌐 **Live app:** *(coming soon)*
📖 **Full story:** *(link to blog post when published)*

---

## Features

- **Salone Vibe Dictionary:** Look up Krio/Salone words and phrases; get AI-powered definitions, cultural context, pronunciation, and usage examples. Lookup is public — no login required.
- **Personal Lexicon (My Stash):** Save and edit your own dictionary entries; correct AI errors and add personal notes. Login required to save.
- **Live Events:** Browse upcoming Salone music events by location; submit events manually or upload a flyer and let Claude extract the details automatically.
- **Artist Explorer:** Browse 12 seeded Salone artists with AI-generated bios, vibe tags, and flexible links. Add new artists by name and Claude generates the bio automatically.
- **Songs I Love (My Stash):** Add the songs that brought you to Salone music, with personal notes.
- **My Artists (My Stash):** Save artists you follow to your personal collection.
- **My Stash:** Personal hub consolidating your saved words, songs, and artists in one place.
- **Google Authentication:** Sign in with Google via Clerk; your data follows you across devices.
- **PWA-enabled:** Install on your phone home screen for quick lookups mid-listen.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite (mobile-first) |
| Auth | Clerk (Google OAuth) |
| Backend | Node.js / Express |
| Database | PostgreSQL |
| AI features | Anthropic Claude API (claude-sonnet-4-6) |
| Hosting | Railway |
| Validation | Zod |

---

## Why Salone-specific?

Krio is a creole language with its own grammar, borrowings, and cultural references, distinct from Nigerian Pidgin, Ghanaian Pidgin, and other West African creoles. Salone music is genuinely underserved by major platforms. Being specific is a feature, not a limitation.

---

## Why Claude API for the dictionary?

General-purpose AI handles Krio slang inconsistently. Claude was chosen after testing showed better cultural context and nuance for Sierra Leonean music specifically. Manual edit capability is built in as a safety net. AI alone is not enough for heavy slang, and human confirmation matters.

---

## Events Data

Salone music events are primarily promoted through Instagram and community networks, not Ticketmaster or Eventbrite. Rather than build on a fragile scraping foundation, Get Am Nice uses a community submission form as the primary data source. Promoters can also upload a flyer and Claude extracts the event details automatically.

---

## Project Status

This app is in active development, built in a single evening session as part of the Building Out Loud with AI series.

**Currently live:**
- Salone Vibe Dictionary with personal lexicon
- Events listing with flyer upload and auto-extraction
- Artist explorer with 12 seeded artists and AI-generated bios
- My Stash (saved words, songs, artists)
- Google authentication
- PWA support

**In progress (Tier 2):**
- Event detail pages
- Artist/event connections
- YouTube playback integration
- Community interpretations

**Planned (Tier 4 / long term):**
- Whole song translations (collaborative, human-confirmed)
- Timestamp-linked lyrics

---

## Artist Seed List

Famous, Emmerson, Rozzy Sokota, Arkman, Dallas Bantan, Camouflage, King Boss LA, King Melody, Jimmy B, Pretty S, Willie Jay, Drizilik

---

## Local Development

*(Coming soon - deployment and local dev instructions will be added as the app matures)*

---

## About

Built by [Boomie Odumade](https://techbees.me) as part of the [Building Out Loud with AI](https://techbees.me/blog/building-out-loud-ai) series. TechBees provides fractional CTO and VP Engineering services and AI literacy education.

[Website](https://techbees.me) | [LinkedIn](https://linkedin.com/in/odumade) | [Speaking](https://sessionize.com/boomie)
