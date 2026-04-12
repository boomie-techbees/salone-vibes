import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function isRailwayPrivateHost(url: string): boolean {
  try {
    const u = new URL(url.replace(/^postgresql:/i, "http:"));
    return u.hostname.endsWith(".railway.internal");
  } catch {
    return false;
  }
}

/** True when the process runs on Railway (private DB hostname resolves). */
function runsOnRailway(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_PROJECT_ID,
  );
}

function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL;
  const pub = process.env.DATABASE_PUBLIC_URL;

  if (!direct) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  if (!runsOnRailway() && isRailwayPrivateHost(direct)) {
    if (pub) return pub;
    throw new Error(
      "DATABASE_URL points at *.railway.internal, which does not resolve on your machine. Set DATABASE_PUBLIC_URL in .env (repo root) for local dev.",
    );
  }

  return direct;
}

export const pool = new Pool({ connectionString: resolveDatabaseUrl() });
export const db = drizzle(pool, { schema });

export * from "./schema";
