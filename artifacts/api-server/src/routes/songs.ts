import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { songsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateSongBody, UpdateSongBody } from "@workspace/api-zod";
import { getOrCreateUser } from "./profile";

const router = Router();

router.get("/songs", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const user = await getOrCreateUser(clerkUserId);
  const songs = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.userId, user.id))
    .orderBy(songsTable.createdAt);

  return res.json(songs);
});

router.post("/songs", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const parseResult = CreateSongBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const user = await getOrCreateUser(clerkUserId);
  const [song] = await db
    .insert(songsTable)
    .values({
      userId: user.id,
      songTitle: parseResult.data.songTitle,
      artistName: parseResult.data.artistName,
      note: parseResult.data.note ?? null,
    })
    .returning();

  return res.status(201).json(song);
});

router.put("/songs/:id", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const parseResult = UpdateSongBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const user = await getOrCreateUser(clerkUserId);
  const existing = await db
    .select()
    .from(songsTable)
    .where(and(eq(songsTable.id, id), eq(songsTable.userId, user.id)))
    .limit(1);

  if (existing.length === 0) return res.status(404).json({ error: "Not found" });

  const data = parseResult.data;
  const [updated] = await db
    .update(songsTable)
    .set({
      ...(data.songTitle !== undefined && { songTitle: data.songTitle }),
      ...(data.artistName !== undefined && { artistName: data.artistName }),
      ...(data.note !== undefined && { note: data.note }),
      updatedAt: new Date(),
    })
    .where(eq(songsTable.id, id))
    .returning();

  return res.json(updated);
});

router.delete("/songs/:id", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const user = await getOrCreateUser(clerkUserId);
  const existing = await db
    .select()
    .from(songsTable)
    .where(and(eq(songsTable.id, id), eq(songsTable.userId, user.id)))
    .limit(1);

  if (existing.length === 0) return res.status(404).json({ error: "Not found" });

  await db.delete(songsTable).where(eq(songsTable.id, id));
  return res.status(204).send();
});

export default router;
