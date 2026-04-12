import type { Request } from "express";
import { getAuth } from "@clerk/express";

/**
 * Admin detection for API routes. Reads `publicMetadata.role === "admin"` from the
 * session JWT (`sessionClaims.publicMetadata` or `public_metadata`). Ensure the Clerk
 * session token template includes public metadata if you rely on this (Dashboard →
 * Sessions → Customize session token). `ADMIN_CLERK_IDS` is an optional env fallback
 * (comma-separated Clerk user IDs).
 */
const ADMIN_ENV_IDS = (process.env.ADMIN_CLERK_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function adminRoleFromClaims(
  claims: Record<string, unknown> | undefined | null,
): string | undefined {
  if (!claims) return undefined;
  const pub =
    (claims.publicMetadata as Record<string, unknown> | undefined) ??
    (claims.public_metadata as Record<string, unknown> | undefined);
  const role = pub?.role;
  return typeof role === "string" ? role : undefined;
}

export function getClerkUserId(req: Request): string | null {
  const auth = getAuth(req);
  return auth.userId ?? null;
}

export function isClerkAdmin(req: Request): boolean {
  const auth = getAuth(req);
  const userId = auth.userId ?? null;
  if (!userId) return false;
  if (ADMIN_ENV_IDS.includes(userId)) return true;
  const claims = auth.sessionClaims as Record<string, unknown> | undefined;
  return adminRoleFromClaims(claims) === "admin";
}
