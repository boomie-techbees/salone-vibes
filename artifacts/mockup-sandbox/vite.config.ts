import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, "");
  const rawPort = env.PORT ?? process.env.PORT;
  const basePath = env.BASE_PATH ?? process.env.BASE_PATH;

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required. Set it in the repo-root .env (e.g. PORT=5173).",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  if (!basePath) {
    throw new Error(
      "BASE_PATH environment variable is required. Set it in the repo-root .env (e.g. BASE_PATH=/).",
    );
  }

  return {
    base: basePath,
    envDir: workspaceRoot,
    plugins: [mockupPreviewPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
