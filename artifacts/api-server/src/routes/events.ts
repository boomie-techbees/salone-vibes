import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable } from "@workspace/db";
import { gte, or, ilike, and } from "drizzle-orm";
import { SubmitEventBody, ListEventsQueryParams } from "@workspace/api-zod";

const router = Router();

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

router.post("/events", async (req, res) => {
  const parseResult = SubmitEventBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const data = parseResult.data;
  const [event] = await db
    .insert(eventsTable)
    .values({
      title: data.title,
      description: data.description ?? null,
      location: data.location,
      city: data.city ?? null,
      country: data.country ?? null,
      eventDate: new Date(data.eventDate),
      venue: data.venue ?? null,
      ticketUrl: data.ticketUrl ?? null,
      submittedBy: data.submittedBy ?? null,
      approved: true,
    })
    .returning();

  return res.status(201).json(event);
});

export default router;
