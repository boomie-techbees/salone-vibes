import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

const router = Router();

async function getOrCreateUser(clerkUserId: string, email?: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(usersTable)
    .values({ clerkUserId, email: email ?? null })
    .returning();

  return created;
}

router.get("/profile", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const email = auth?.sessionClaims?.email as string | undefined;
  const user = await getOrCreateUser(clerkUserId, email);
  return res.json(user);
});

router.put("/profile", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = UpdateProfileBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  const user = await getOrCreateUser(clerkUserId);
  const [updated] = await db
    .update(usersTable)
    .set({ displayName: parseResult.data.displayName, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  return res.json(updated);
});

export { getOrCreateUser };
export default router;
