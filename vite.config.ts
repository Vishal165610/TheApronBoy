// @lovable.dev/vite-tanstack-config already includes standard plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      // Prevents Vite from parsing firebase-admin into code chunks
      external: ["firebase-admin"],
    },
    build: {
      rollupOptions: {
        // Keeps the import statements completely separate from the bundle output
        external: ["firebase-admin"],
      },
    },
  },
  nitro: {
    preset: "vercel",
    externals: {
      inline: [],
      external: ["firebase-admin"],
    },
  },
});