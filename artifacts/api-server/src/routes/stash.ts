import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { stashedArtistsTable, artistsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { StashArtistBody } from "@workspace/api-zod";
import { getOrCreateUser } from "./profile";

const router = Router();

router.get("/stash/artists", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const user = await getOrCreateUser(clerkUserId);

  const rows = await db
    .select({
      id: stashedArtistsTable.id,
      artistId: stashedArtistsTable.artistId,
      createdAt: stashedArtistsTable.createdAt,
      artist: artistsTable,
    })
    .from(stashedArtistsTable)
    .innerJoin(artistsTable, eq(stashedArtistsTable.artistId, artistsTable.id))
    .where(eq(stashedArtistsTable.userId, user.id))
    .orderBy(stashedArtistsTable.createdAt);

  return res.json(rows);
});

router.post("/stash/artists", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const parseResult = StashArtistBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const { artistId } = parseResult.data;

  const artistExists = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.id, artistId))
    .limit(1);

  if (artistExists.length === 0) {
    return res.status(404).json({ error: "Artist not found" });
  }

  const user = await getOrCreateUser(clerkUserId);

  const existing = await db
    .select()
    .from(stashedArtistsTable)
    .where(
      and(
        eq(stashedArtistsTable.userId, user.id),
        eq(stashedArtistsTable.artistId, artistId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Already stashed" });
  }

  const [entry] = await db
    .insert(stashedArtistsTable)
    .values({ userId: user.id, artistId })
    .returning();

  const [artist] = await db
    .select()
    .from(artistsTable)
    .where(eq(artistsTable.id, artistId))
    .limit(1);

  return res.status(201).json({ ...entry, artist });
});

router.delete("/stash/artists/:artistId", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const artistId = Number(req.params.artistId);
  if (!Number.isInteger(artistId) || artistId < 1) {
    return res.status(400).json({ error: "Invalid artistId" });
  }

  const user = await getOrCreateUser(clerkUserId);

  const existing = await db
    .select()
    .from(stashedArtistsTable)
    .where(
      and(
        eq(stashedArtistsTable.userId, user.id),
        eq(stashedArtistsTable.artistId, artistId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  await db
    .delete(stashedArtistsTable)
    .where(
      and(
        eq(stashedArtistsTable.userId, user.id),
        eq(stashedArtistsTable.artistId, artistId),
      ),
    );

  return res.status(204).send();
});

export default router;
