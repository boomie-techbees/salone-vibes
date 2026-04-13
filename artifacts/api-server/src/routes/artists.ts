import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { artistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getClerkUserId, isClerkAdmin } from "../lib/clerkAdmin";

const CreateArtistBody = z.object({ name: z.string().min(1).max(200) });

const SaloneArtistValidationSchema = z.object({
  accepted: z.boolean(),
  reason: z.string().optional(),
});

const UpdateArtistBody = z.object({
  name: z.string().min(1).optional(),
  photoUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  vibeTags: z.array(z.string()).nullable().optional(),
  links: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .nullable()
    .optional(),
});

const router = Router();

/**
 * Reject obvious non-Salone / spam names before generating a bio (logged-in users can add artists).
 * Skipped when ANTHROPIC_API_KEY is unset (local dev parity with bio generation fallback).
 */
async function validateArtistBelongsInSaloneDirectory(
  name: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { ok: true };
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You gate submissions for "Salone Vibes", a Sierra Leone–focused music app (Salone = Sierra Leone). The directory highlights artists tied to Sierra Leonean music culture: afrobeats, highlife, palm wine, bubu, Krio rap, dancehall from the region, producers and DJs in that scene, and diaspora acts clearly rooted in or representing that wave.

Proposed name to add (exact string):
"${name.replace(/"/g, '\\"')}"

ACCEPT (accepted: true) if any of these apply:
- Sierra Leonean artist, DJ, or producer, OR
- Clearly part of the Sierra Leone / Salone music scene or its diaspora, OR
- Plausible stage/local name in that scene (OK if uncertain).

REJECT (accepted: false) if:
- Obvious spam, slurs, gibberish, or not a person/artist name, OR
- Placeholders: "TBA", "N/A", "test", "asdf", lone "DJ" / "MC", etc., OR
- A major global act with no meaningful tie to Sierra Leone or Salone music (reject Taylor Swift–type entries with no Salone link).

Beta rule: when genuinely unsure, lean ACCEPT so real scene artists are not blocked; reject only clear outsiders and garbage.

Reply with ONLY valid JSON (boolean true/false, no trailing commentary):
{"accepted": true, "reason": ""}
or
{"accepted": false, "reason": "one short sentence explaining why"}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, reason: "Could not validate this name. Try again." };
    }
    const parsed = SaloneArtistValidationSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success || !parsed.data.accepted) {
      const reason =
        parsed.success && parsed.data.reason?.trim()
          ? parsed.data.reason.trim()
          : "This doesn’t look like a fit for the Salone artist directory.";
      return { ok: false, reason };
    }
    return { ok: true };
  } catch (err) {
    console.error("[artists] Salone validation failed:", err);
    return { ok: false, reason: "Validation failed. Try again in a moment." };
  }
}

async function generateArtistBioAndTags(
  name: string,
): Promise<{ bio: string; vibeTags: string[] }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return {
      bio: `${name} is a Salone music artist.`,
      vibeTags: ["Afrobeats", "Salone"],
    };
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a Sierra Leonean music journalist writing for a Salone cultural app.

Write a short, exciting 2-3 sentence bio for the Salone music artist named "${name}". The bio should feel like it could be real — rooted in Sierra Leonean music culture (afrobeats, palm wine, bubu, highlife, hip-hop, dancehall influences). Don't make up specific personal facts like hometown or record deals — keep it general but vivid and celebratory.

Also suggest 3-5 vibe/genre tags for this artist. Tags should be short, punchy words or phrases like: Afrobeats, Salone Drill, Palm Wine, Highlife, Dancehall, Krio Rap, Party Banger, Street Vibes, Melodic, Conscious, etc.

Respond with ONLY a JSON object like:
{
  "bio": "...",
  "vibeTags": ["...", "...", "..."]
}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = z
      .object({ bio: z.string(), vibeTags: z.array(z.string()) })
      .parse(parsed);
    return validated;
  } catch (err) {
    console.error("[artists] AI generation failed:", err);
    return {
      bio: `${name} is a rising star in the Salone music scene, bringing fresh energy and authentic sounds to listeners everywhere.`,
      vibeTags: ["Afrobeats", "Salone", "Street Vibes"],
    };
  }
}

router.get("/artists", async (_req, res) => {
  const artists = await db
    .select()
    .from(artistsTable)
    .orderBy(artistsTable.name);
  return res.json(artists);
});

router.get("/artists/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid artist id" });
  }

  const [artist] = await db
    .select()
    .from(artistsTable)
    .where(eq(artistsTable.id, id))
    .limit(1);

  if (!artist) {
    return res.status(404).json({ error: "Artist not found" });
  }

  return res.json(artist);
});

router.post("/artists", async (req, res) => {
  if (!getClerkUserId(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = CreateArtistBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const { name } = parseResult.data;

  const validation = await validateArtistBelongsInSaloneDirectory(name);
  if (!validation.ok) {
    return res.status(422).json({
      error: "artist_not_eligible",
      message: validation.reason,
    });
  }

  const { bio, vibeTags } = await generateArtistBioAndTags(name);

  const [artist] = await db
    .insert(artistsTable)
    .values({ name, bio, vibeTags })
    .returning();

  return res.status(201).json(artist);
});

router.put("/artists/:id", async (req, res) => {
  if (!getClerkUserId(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!isClerkAdmin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid artist id" });
  }

  const parseResult = UpdateArtistBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const [existing] = await db
    .select()
    .from(artistsTable)
    .where(eq(artistsTable.id, id))
    .limit(1);

  if (!existing) {
    return res.status(404).json({ error: "Artist not found" });
  }

  const data = parseResult.data;
  const [updated] = await db
    .update(artistsTable)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.vibeTags !== undefined && { vibeTags: data.vibeTags }),
      ...(data.links !== undefined && { links: data.links }),
      updatedAt: new Date(),
    })
    .where(eq(artistsTable.id, id))
    .returning();

  return res.json(updated);
});

export default router;
