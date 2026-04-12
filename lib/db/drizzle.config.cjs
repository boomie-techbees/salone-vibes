const fs = require("node:fs");
const path = require("node:path");
const { defineConfig } = require("drizzle-kit");

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("export ")) trimmed = trimmed.slice(7).trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function isRailwayTemplate(value) {
  return typeof value === "string" && value.includes("${{");
}

/** Hostnames like postgres.railway.internal only resolve inside Railway’s network, not on your laptop. */
function isRailwayPrivateHost(value) {
  if (!value || isRailwayTemplate(value)) return false;
  try {
    const u = new URL(value.replace(/^postgresql:/i, "http:"));
    return u.hostname.endsWith(".railway.internal");
  } catch {
    return false;
  }
}

function resolveDbUrl() {
  const direct = process.env.DATABASE_URL;
  const pub = process.env.DATABASE_PUBLIC_URL;

  const pubOk = pub && !isRailwayTemplate(pub);
  const directOk = direct && !isRailwayTemplate(direct);

  if (directOk && isRailwayPrivateHost(direct)) {
    if (pubOk) return pub;
    throw new Error(
      "DATABASE_URL uses a Railway private host (*.railway.internal), which does not work from your Mac. Set DATABASE_PUBLIC_URL to the TCP proxy URL from Railway (Postgres → Connect / Variables), then run push again.",
    );
  }

  if (directOk) return direct;
  if (pubOk) return pub;
  if (direct) return direct;
  if (pub) return pub;
  return undefined;
}

const dbUrl = resolveDbUrl();

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to the repo-root .env or export it in your shell.",
  );
}

if (isRailwayTemplate(dbUrl)) {
  throw new Error(
    "DATABASE_URL still contains Railway placeholders (${{...}}). For drizzle-kit from your laptop, paste a full connection string from Railway (Postgres → Connect / Variables), or set DATABASE_PUBLIC_URL to the TCP proxy URL without templates.",
  );
}

module.exports = defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
