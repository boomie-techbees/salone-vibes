import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const artistLinksSchema = z.array(
  z.object({ label: z.string(), url: z.string() }),
);

export const artistsTable = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  vibeTags: text("vibe_tags").array(),
  links: jsonb("links").$type<{ label: string; url: string }[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertArtistSchema = createInsertSchema(artistsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type Artist = typeof artistsTable.$inferSelect;
