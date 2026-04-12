import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

/** Vite outDir for get-am-nice (see vite.config.ts). Override with FRONTEND_STATIC_DIR if layout differs. */
function resolveFrontendStaticDir(): string | null {
  const fromEnv = process.env.FRONTEND_STATIC_DIR;
  if (fromEnv) {
    const abs = path.resolve(fromEnv);
    if (fs.existsSync(abs)) return abs;
    logger.warn({ FRONTEND_STATIC_DIR: fromEnv }, "FRONTEND_STATIC_DIR set but path does not exist");
  }
  // pnpm runs `start` with cwd = artifacts/api-server, not repo root — do not rely on cwd alone.
  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(bundleDir, "../../get-am-nice/dist/public"),
    path.resolve(process.cwd(), "../get-am-nice/dist/public"),
    path.join(process.cwd(), "artifacts/get-am-nice/dist/public"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const allowedOrigins: string[] | true = process.env.NODE_ENV === "production"
  ? [process.env.ALLOWED_ORIGIN].filter((o): o is string => Boolean(o))
  : true;
app.use(cors({ credentials: true, origin: allowedOrigins }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(clerkMiddleware());

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const staticDir = resolveFrontendStaticDir();
  if (staticDir) {
    app.use(
      express.static(staticDir, {
        index: false,
        maxAge: "1h",
      }),
    );
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(staticDir, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  } else {
    logger.warn(
      "Production: frontend static files not found (expected artifacts/get-am-nice/dist/public or FRONTEND_STATIC_DIR). Run get-am-nice build before deploy.",
    );
  }
}

export default app;
