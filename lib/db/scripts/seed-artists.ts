import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db, artistsTable } from "../src/index";

const ARTISTS = [
  "Famous",
  "Emmerson",
  "Rozzy Sokota",
  "Arkman",
  "Dallas Bantan",
  "Camouflage",
  "King Boss LA",
  "King Melody",
  "Jimmy B",
  "Pretty S",
  "Willie Jay",
];

async function generateBioAndTags(
  client: Anthropic,
  name: string,
): Promise<{ bio: string; vibeTags: string[] }> {
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
    console.error(`  [!] AI failed for ${name}:`, err);
    return {
      bio: `${name} is a celebrated figure in the Salone music scene, known for infectious rhythms and authentic sound that resonates across Sierra Leone and beyond.`,
      vibeTags: ["Afrobeats", "Salone", "Street Vibes"],
    };
  }
}

async function main() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not set — using fallback bios");
  }
  const client = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

  console.log(`Seeding ${ARTISTS.length} artists...`);

  for (const name of ARTISTS) {
    const existing = await db
      .select({ id: artistsTable.id })
      .from(artistsTable)
      .limit(1);

    // Check by name
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({ id: artistsTable.id })
      .from(artistsTable)
      .where(eq(artistsTable.name, name))
      .limit(1);

    if (rows.length > 0) {
      console.log(`  [skip] ${name} already exists`);
      continue;
    }

    console.log(`  [+] ${name} — generating bio...`);
    const { bio, vibeTags } = client
      ? await generateBioAndTags(client, name)
      : {
          bio: `${name} is a celebrated figure in the Salone music scene, known for infectious rhythms and authentic sound that resonates across Sierra Leone and beyond.`,
          vibeTags: ["Afrobeats", "Salone", "Street Vibes"],
        };

    await db.insert(artistsTable).values({ name, bio, vibeTags });
    console.log(`  [✓] ${name} — tags: ${vibeTags.join(", ")}`);
  }

  console.log("Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
