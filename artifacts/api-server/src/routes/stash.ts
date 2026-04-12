import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  stashedArtistsTable,
  artistsTable,
  stashedEventsTable,
  eventsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { StashArtistBody, StashEventBody } from "@workspace/api-zod";
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

router.get("/stash/events", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const user = await getOrCreateUser(clerkUserId);

  const rows = await db
    .select({
      id: stashedEventsTable.id,
      eventId: stashedEventsTable.eventId,
      createdAt: stashedEventsTable.createdAt,
      event: eventsTable,
    })
    .from(stashedEventsTable)
    .innerJoin(eventsTable, eq(stashedEventsTable.eventId, eventsTable.id))
    .where(eq(stashedEventsTable.userId, user.id))
    .orderBy(stashedEventsTable.createdAt);

  return res.json(rows);
});

router.post("/stash/events", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const parseResult = StashEventBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const { eventId } = parseResult.data;

  const eventExists = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (eventExists.length === 0) {
    return res.status(404).json({ error: "Event not found" });
  }

  const user = await getOrCreateUser(clerkUserId);

  const existing = await db
    .select()
    .from(stashedEventsTable)
    .where(
      and(
        eq(stashedEventsTable.userId, user.id),
        eq(stashedEventsTable.eventId, eventId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Already stashed" });
  }

  const [entry] = await db
    .insert(stashedEventsTable)
    .values({ userId: user.id, eventId })
    .returning();

  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  return res.status(201).json({ ...entry, event });
});

router.delete("/stash/events/:eventId", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: "Unauthorized" });

  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId < 1) {
    return res.status(400).json({ error: "Invalid eventId" });
  }

  const user = await getOrCreateUser(clerkUserId);

  const existing = await db
    .select()
    .from(stashedEventsTable)
    .where(
      and(
        eq(stashedEventsTable.userId, user.id),
        eq(stashedEventsTable.eventId, eventId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  await db
    .delete(stashedEventsTable)
    .where(
      and(
        eq(stashedEventsTable.userId, user.id),
        eq(stashedEventsTable.eventId, eventId),
      ),
    );

  return res.status(204).send();
});

export default router;
