import react from "@vitejs/plugin-react";
import { vavite } from "vavite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
  buildSteps: [
    {
      name: "client",
      config: {
        build: {
          outDir: "dist/client",
          manifest: true,
          rollupOptions: { input: "src/index.client.tsx" },
        },
      },
    },
    {
      name: "server",
      config: {
        build: {
          ssr: true,
          outDir: "dist/server",
        },
      },
    },
  ],
  plugins: [
    // To be able to load the manifest path
    tsconfigPaths(),
    react(),
    vavite({
      // Production:
      serverEntry: "src/index.server.ts",
      // Development:
      handlerEntry: "src/index.vite-dev.ts",
      serveClientAssetsInDev: true,
      // If we want to use a server-entry for both, remove the `handlerEntry`
      // and use something like the following:
      // serverEntry: process.env.NODE_ENV === "development" ? "src/index.vite-dev.ts" : "src/index.server.ts",
    }),
  ],
});
