import { Router } from "express";
import { getAuth } from "@clerk/express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { lexiconEntriesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  DictionaryLookupBody,
  CreateLexiconEntryBody,
  UpdateLexiconEntryBody,
  UpdateLexiconEntryParams,
  DeleteLexiconEntryParams,
} from "@workspace/api-zod";
import { getOrCreateUser } from "./profile";

const DictionaryEntryResponseSchema = z.object({
  term: z.string(),
  definition: z.string(),
  culturalContext: z.string(),
  usageExamples: z.array(z.string()),
  pronunciation: z.string().optional(),
  partOfSpeech: z.string().optional(),
});

const router = Router();

const TERM_OF_THE_DAY_TERMS = [
  {
    term: "Kusheh",
    definition: "A warm greeting meaning 'hello' or 'how are you?' — the standard way to acknowledge someone in Krio.",
    culturalContext: "Kusheh is the heartbeat of Salone greetings. You'll hear it on the streets of Freetown, at market stalls, and between friends everywhere. It carries warmth and openness — refusing to say it would be considered rude.",
    usageExamples: [
      "Kusheh, how di body? (Hello, how are you?)",
      "Kusheh-o! (A more emphatic greeting)",
      "Di teacher dem tok kusheh to di pikin dem. (The teachers greeted the children.)",
    ],
    pronunciation: "KOO-sheh",
    partOfSpeech: "interjection / greeting",
  },
  {
    term: "Sabi",
    definition: "To know, understand, or be skilled at something.",
    culturalContext: "Sabi is one of Krio's most versatile and frequently used words. It covers knowing a person, knowing a fact, and having skill. It derives from Portuguese 'saber' (to know), a legacy of early European contact with West Africa.",
    usageExamples: [
      "Yu sabi am? (Do you know him/her/it?)",
      "A no sabi how fo du am. (I don't know how to do it.)",
      "Di man sabi cook. (The man knows how to cook.)",
    ],
    pronunciation: "SAH-bee",
    partOfSpeech: "verb",
  },
  {
    term: "Pikin",
    definition: "Child or children; also used affectionately for a young person.",
    culturalContext: "Pikin is one of the most widely used Krio words, derived from Portuguese 'pequenino' (little one). It's used with tremendous affection. Parents call their children pikin, elders call young people pikin as a term of endearment. It crosses age lines — even adults are called pikin by their elders.",
    usageExamples: [
      "Di pikin dem dey play. (The children are playing.)",
      "Yu still na pikin. (You're still young/a child.)",
      "Mi pikin, komot na de. (My child, come away from there.)",
    ],
    pronunciation: "PIH-kin",
    partOfSpeech: "noun",
  },
];

function getTodaysTerm() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return TERM_OF_THE_DAY_TERMS[dayOfYear % TERM_OF_THE_DAY_TERMS.length];
}

router.get("/dictionary/term-of-the-day", (_req, res) => {
  return res.json(getTodaysTerm());
});

router.post("/dictionary/lookup", async (req, res) => {
  const parseResult = DictionaryLookupBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const { term } = parseResult.data;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(503).json({ error: "Dictionary service not configured. ANTHROPIC_API_KEY is missing." });
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const systemPrompt = `You are an expert in Sierra Leonean Krio language and culture. When given a Krio or Salone word or phrase, you provide:
1. A clear definition in English
2. Cultural context explaining the word's significance in Salone culture and daily life
3. 2-3 practical usage examples in Krio with English translations in parentheses
4. Pronunciation guide (syllable breakdown)
5. Part of speech

If the input is English, explain how it would be expressed in Krio and provide the Krio equivalent.
If the word is unclear or not Krio, make your best effort to connect it to Salone culture.

Always respond in JSON format exactly matching this structure:
{
  "term": "the word/phrase as provided",
  "definition": "clear English definition",
  "culturalContext": "cultural significance and context in Salone",
  "usageExamples": ["Example sentence in Krio (English translation)", "Another example (Translation)", "Third example (Translation)"],
  "pronunciation": "syllable guide e.g. ah-LEE-koh",
  "partOfSpeech": "noun/verb/adjective/interjection/etc"
}`;

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: `Look up this Krio/Salone word or phrase: "${term}"` }],
      system: systemPrompt,
    });
  } catch (err) {
    const isApiErr = err instanceof Anthropic.APIError;
    const status = isApiErr ? err.status : 502;
    const detail = isApiErr ? err.message : "Dictionary service unavailable";
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: detail });
  }

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: unknown;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return res.status(500).json({ error: "Failed to parse AI response" });
  }

  const validated = DictionaryEntryResponseSchema.safeParse(parsed);
  if (!validated.success) {
    return res.status(500).json({ error: "AI response did not match expected format" });
  }

  return res.json(validated.data);
});

router.get("/dictionary/lexicon", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await getOrCreateUser(clerkUserId);
  const entries = await db
    .select()
    .from(lexiconEntriesTable)
    .where(eq(lexiconEntriesTable.userId, user.id))
    .orderBy(lexiconEntriesTable.createdAt);

  return res.json(entries);
});

router.post("/dictionary/lexicon", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = CreateLexiconEntryBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const user = await getOrCreateUser(clerkUserId);
  const [entry] = await db
    .insert(lexiconEntriesTable)
    .values({
      userId: user.id,
      term: parseResult.data.term,
      definition: parseResult.data.definition,
      culturalContext: parseResult.data.culturalContext,
      usageExamples: parseResult.data.usageExamples ?? [],
      pronunciation: parseResult.data.pronunciation ?? null,
      partOfSpeech: parseResult.data.partOfSpeech ?? null,
      notes: parseResult.data.notes ?? null,
    })
    .returning();

  return res.status(201).json(entry);
});

router.put("/dictionary/lexicon/:id", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const paramsResult = UpdateLexiconEntryParams.safeParse({ id: Number(req.params.id) });
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const bodyResult = UpdateLexiconEntryBody.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({ error: bodyResult.error.issues });
  }

  const user = await getOrCreateUser(clerkUserId);
  const existing = await db
    .select()
    .from(lexiconEntriesTable)
    .where(and(eq(lexiconEntriesTable.id, paramsResult.data.id), eq(lexiconEntriesTable.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  const updateData: Partial<typeof lexiconEntriesTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (bodyResult.data.definition !== undefined) updateData.definition = bodyResult.data.definition;
  if (bodyResult.data.culturalContext !== undefined) updateData.culturalContext = bodyResult.data.culturalContext;
  if (bodyResult.data.usageExamples !== undefined) updateData.usageExamples = bodyResult.data.usageExamples;
  if (bodyResult.data.pronunciation !== undefined) updateData.pronunciation = bodyResult.data.pronunciation;
  if (bodyResult.data.partOfSpeech !== undefined) updateData.partOfSpeech = bodyResult.data.partOfSpeech;
  if (bodyResult.data.notes !== undefined) updateData.notes = bodyResult.data.notes;

  const [updated] = await db
    .update(lexiconEntriesTable)
    .set(updateData)
    .where(eq(lexiconEntriesTable.id, paramsResult.data.id))
    .returning();

  return res.json(updated);
});

router.delete("/dictionary/lexicon/:id", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const paramsResult = DeleteLexiconEntryParams.safeParse({ id: Number(req.params.id) });
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const user = await getOrCreateUser(clerkUserId);
  const existing = await db
    .select()
    .from(lexiconEntriesTable)
    .where(and(eq(lexiconEntriesTable.id, paramsResult.data.id), eq(lexiconEntriesTable.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  await db.delete(lexiconEntriesTable).where(eq(lexiconEntriesTable.id, paramsResult.data.id));
  return res.status(204).send();
});

export default router;
