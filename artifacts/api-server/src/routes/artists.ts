import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { artistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getClerkUserId, isClerkAdmin } from "../lib/clerkAdmin";

const CreateArtistBody = z.object({ name: z.string().min(1) });

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
  if (!isClerkAdmin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parseResult = CreateArtistBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const { name } = parseResult.data;
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
