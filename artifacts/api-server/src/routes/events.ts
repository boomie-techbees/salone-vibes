import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { eventsTable, stashedEventsTable } from "@workspace/db";
import { gte, or, ilike, and, eq, sql, lt, count } from "drizzle-orm";
import { z } from "zod";
import { SubmitEventBody, ListEventsQueryParams } from "@workspace/api-zod";
import { getClerkUserId, isClerkAdmin } from "../lib/clerkAdmin";

const ExtractFlyerBody = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

const ExtractedEventSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  ticketUrl: z.string().nullable().optional(),
  artists: z.string().nullable().optional(),
  /** Names and phone numbers from the flyer (appended into description on the client). */
  contactPhones: z.string().nullable().optional(),
});

function firstNonEmptyString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    }
    if (Array.isArray(v) && v.length > 0) {
      const joined = v
        .map((x) => (typeof x === "string" ? x.trim() : String(x)))
        .filter(Boolean)
        .join(" · ");
      if (joined) return joined;
    }
  }
  return undefined;
}

/**
 * Merge alternate keys into description / contactPhones before Zod parse (models vary).
 * Pricing and admission tiers go into description — we do not store a separate admission field.
 */
function normalizeExtractedJson(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }
  const o = { ...(parsed as Record<string, unknown>) };

  const priceBlob = firstNonEmptyString(
    o.admissionInfo,
    o.admission_info,
    o.pricing,
    o.admission,
    o.prices,
    o.ticketPrices,
    o.ticket_prices,
    o.cost,
    o.admissionPrice,
    o.admission_price,
    o.ticketPrice,
  );
  if (priceBlob) {
    const desc = typeof o.description === "string" ? o.description.trim() : "";
    o.description = [desc, priceBlob].filter(Boolean).join("\n\n") || priceBlob;
  }

  const phonesMerged = firstNonEmptyString(
    o.contactPhones,
    o.contact_phones,
    o.phone,
    o.phones,
    o.contact,
    o.contacts,
    o.phoneNumbers,
  );
  if (phonesMerged) {
    o.contactPhones = phonesMerged;
  }

  return o;
}

/** Collapse text for cross-user duplicate detection (same flyer, slightly different typing). */
function normalizeDedupeText(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Same words in any order (handles "Freetown, Sierra Leone" vs "Sierra Leone — Freetown"
 * and words split across location vs venue).
 */
function tokenSortKey(raw: string | null | undefined): string {
  const collapsed = normalizeDedupeText(raw ?? "");
  if (!collapsed) return "";
  return collapsed.split(" ").filter(Boolean).sort().join(" ");
}

function placeDedupeKey(location: string, venue: string | null | undefined): string {
  const merged = [location, venue ?? ""].filter((s) => typeof s === "string" && s.trim() !== "").join(" ");
  return tokenSortKey(merged);
}

function utcDayRangeForInstant(d: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
  return { start, end };
}

const router = Router();

router.post("/events/extract-flyer", async (req, res) => {
  if (!getClerkUserId(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = ExtractFlyerBody.safeParse(req.body);
  if (!parseResult.success) {
    console.error("[extract-flyer] invalid body:", parseResult.error.issues);
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const { imageBase64, mimeType } = parseResult.data;
  const approxKB = Math.round((imageBase64.length * 3) / 4 / 1024);
  console.log(`[extract-flyer] image size ~${approxKB}KB mimeType=${mimeType}`);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("[extract-flyer] ANTHROPIC_API_KEY missing");
    return res.status(503).json({ error: "AI service not configured" });
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            {
              type: "text",
              text: `This is an event flyer. Extract every piece of information you can see and return it as a JSON object with these exact keys:
{
  "title": "the event name or title (string or null)",
  "description": "promo text, presenter line, venue notes, AND all admission/pricing (every tier and dollar amount) and VIP perks — everything except phone numbers (string or null). Include prices verbatim, e.g. 'Regular admission: $120 · VIP: $150 (includes dinner & drinks)'.",
  "date": "the event date formatted as YYYY-MM-DD (string or null — if month/day only, use current year 2026)",
  "time": "start time in 12h format like '8:00 PM' (string or null — use null if no time is printed)",
  "venue": "the venue or club name (string or null)",
  "street": "the street address — building number and street name only, e.g. '8500 Annapolis Road' (string or null)",
  "city": "the city and state/province/zip if shown, e.g. 'New Carrollton, MD 20784' (string or null)",
  "country": "the country (string or null)",
  "location": "a combined short location string like 'Freetown, Sierra Leone' (string or null)",
  "ticketUrl": "a ticket purchase URL ONLY if a full http(s) URL is visible on the flyer (string or null — do not invent URLs)",
  "artists": "performing artists or DJs, comma-separated (string or null)",
  "contactPhones": "every phone number with the name or label next to it on the flyer, e.g. 'Mabinty: (240) 481-7055 · Nabs: (240) 413-9922' (string or null)"
}
Return ONLY the JSON object, no commentary.`,
            },
          ],
        },
      ],
    });
    console.log("[extract-flyer] Claude responded, stop_reason:", message.stop_reason);
  } catch (err) {
    console.error("[extract-flyer] Anthropic API error:", err);
    const isApiErr = err instanceof Anthropic.APIError;
    const status = isApiErr ? err.status : 502;
    const detail = isApiErr ? err.message : "AI service unavailable";
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: detail });
  }

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  console.log("[extract-flyer] raw text:", text.slice(0, 300));

  let parsed: unknown;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (e) {
    console.error("[extract-flyer] JSON parse error:", e, "raw:", text.slice(0, 500));
    return res.status(500).json({ error: "Failed to parse AI response" });
  }

  const validated = ExtractedEventSchema.safeParse(normalizeExtractedJson(parsed));
  if (!validated.success) {
    console.error("[extract-flyer] schema validation error:", validated.error.issues, "parsed:", parsed);
    return res.status(500).json({ error: "AI response did not match expected format" });
  }

  console.log("[extract-flyer] success:", validated.data);
  return res.json(validated.data);
});

router.get("/events", async (req, res) => {
  const parseResult = ListEventsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }
  const location = parseResult.data.location;

  const now = new Date();
  const upcomingFilter = gte(eventsTable.eventDate, now);

  const whereClause = location
    ? and(
        upcomingFilter,
        or(
          ilike(eventsTable.location, `%${location}%`),
          ilike(eventsTable.city, `%${location}%`),
          ilike(eventsTable.country, `%${location}%`),
        ),
      )
    : upcomingFilter;

  const events = await db
    .select()
    .from(eventsTable)
    .where(whereClause)
    .orderBy(eventsTable.eventDate);
  return res.json(events);
});

router.get("/events/upcoming-preview", async (_req, res) => {
  const now = new Date();
  const events = await db
    .select()
    .from(eventsTable)
    .where(gte(eventsTable.eventDate, now))
    .orderBy(eventsTable.eventDate)
    .limit(3);

  return res.json(events);
});

router.get("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, id))
    .limit(1);

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  return res.json(event);
});

router.post("/events", async (req, res) => {
  const parseResult = SubmitEventBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const clerkUserId = getClerkUserId(req);
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const data = parseResult.data;
  const eventInstant = new Date(data.eventDate);

  const ticketTrimmed = data.ticketUrl?.trim() ?? "";
  if (ticketTrimmed) {
    const [byTicket] = await db
      .select({ id: eventsTable.id })
      .from(eventsTable)
      .where(sql`lower(trim(${eventsTable.ticketUrl})) = lower(trim(${ticketTrimmed}))`)
      .limit(1);
    if (byTicket) {
      return res.status(409).json({
        error: "duplicate_event",
        message: "An event with this ticket link is already listed.",
        existingId: byTicket.id,
      });
    }
  }

  const titleNorm = normalizeDedupeText(data.title);
  const newPlaceKey = placeDedupeKey(data.location, data.venue ?? null);
  const { start: dayStart, end: dayEnd } = utcDayRangeForInstant(eventInstant);

  const dayCandidates = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      location: eventsTable.location,
      venue: eventsTable.venue,
    })
    .from(eventsTable)
    .where(and(gte(eventsTable.eventDate, dayStart), lt(eventsTable.eventDate, dayEnd)));

  for (const row of dayCandidates) {
    if (normalizeDedupeText(row.title) !== titleNorm) continue;

    const rowPlaceKey = placeDedupeKey(row.location, row.venue);
    const strictLocationMatch = normalizeDedupeText(row.location) === normalizeDedupeText(data.location);
    const fuzzyPlaceMatch =
      newPlaceKey.length > 0 && rowPlaceKey === newPlaceKey;

    if (strictLocationMatch || fuzzyPlaceMatch) {
      return res.status(409).json({
        error: "duplicate_event",
        message: "This event is already on the calendar (same title, date, and place).",
        existingId: row.id,
      });
    }
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      title: data.title,
      description: data.description ?? null,
      location: data.location,
      city: data.city ?? null,
      country: data.country ?? null,
      eventDate: eventInstant,
      venue: data.venue ?? null,
      ticketUrl: data.ticketUrl ?? null,
      performingArtists: data.performingArtists ?? null,
      submittedBy: clerkUserId,
      approved: true,
    })
    .returning();

  return res.status(201).json(event);
});

router.put("/events/:id", async (req, res) => {
  const clerkUserId = getClerkUserId(req);
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  const parseResult = SubmitEventBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const [existing] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, id))
    .limit(1);

  if (!existing) {
    return res.status(404).json({ error: "Event not found" });
  }

  const canEdit =
    isClerkAdmin(req) || existing.submittedBy === clerkUserId;
  if (!canEdit) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const data = parseResult.data;
  const [updated] = await db
    .update(eventsTable)
    .set({
      title: data.title,
      description: data.description ?? null,
      location: data.location,
      city: data.city ?? null,
      country: data.country ?? null,
      eventDate: new Date(data.eventDate),
      venue: data.venue ?? null,
      ticketUrl: data.ticketUrl ?? null,
      performingArtists: data.performingArtists ?? null,
    })
    .where(eq(eventsTable.id, id))
    .returning();

  return res.json(updated);
});

router.delete("/events/:id", async (req, res) => {
  const clerkUserId = getClerkUserId(req);
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  const existingRows = await db
    .select({ id: eventsTable.id, submittedBy: eventsTable.submittedBy })
    .from(eventsTable)
    .where(eq(eventsTable.id, id))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ error: "Event not found" });
  }

  const canDelete =
    isClerkAdmin(req) || existing.submittedBy === clerkUserId;
  if (!canDelete) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [stashAgg] = await db
    .select({ stashCount: count() })
    .from(stashedEventsTable)
    .where(eq(stashedEventsTable.eventId, id));

  const stashCount = Number(stashAgg?.stashCount ?? 0);
  const confirmRemoveStashes =
    req.query.confirmRemoveStashes === "true" || req.query.confirmRemoveStashes === "1";

  if (stashCount > 0 && !confirmRemoveStashes) {
    return res.status(409).json({
      error: "event_has_stashes",
      stashCount,
      message:
        "This event is saved in one or more users’ Stash. Deleting it removes the calendar entry and those stash links.",
    });
  }

  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  return res.status(204).send();
});

export default router;
