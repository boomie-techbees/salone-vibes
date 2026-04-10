import { pgTable, serial, text, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const lexiconEntriesTable = pgTable("lexicon_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  definition: text("definition").notNull(),
  culturalContext: text("cultural_context").notNull(),
  usageExamples: json("usage_examples").$type<string[]>().notNull().default([]),
  pronunciation: text("pronunciation"),
  partOfSpeech: text("part_of_speech"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLexiconEntrySchema = createInsertSchema(lexiconEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLexiconEntry = z.infer<typeof insertLexiconEntrySchema>;
export type LexiconEntry = typeof lexiconEntriesTable.$inferSelect;
