// @lovable.dev/vite-tanstack-config already includes standard plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Packages that must NOT be bundled into the server output — Vite/Rolldown
// mangle firebase-admin and mongodb's internal module structure when they
// try to inline them, causing runtime errors like
// "Cannot read properties of undefined (reading 'SDK_VERSION')".
// Node.js on Vercel loads these fine directly from node_modules, so we just
// need to keep them external instead of bundled.
//
// Regex (not a function) on purpose: this project's Vite build uses
// Rolldown, whose `external` option only accepts `string | RegExp` — a
// matcher function throws "Invalid type: Expected (string | RegExp) but
// received Function" at build time. The regex below still matches deep
// imports like "firebase-admin/app" and "firebase-admin/auth", which a
// plain string entry would silently miss.
const serverOnlyExternals = [/^firebase-admin(\/.*)?$/, /^mongodb(\/.*)?$/];

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      // Prevents Vite from parsing firebase-admin/mongodb into code chunks
      external: serverOnlyExternals,
    },
    build: {
      rollupOptions: {
        // Keeps the import statements completely separate from the bundle output
        external: serverOnlyExternals,
      },
    },
  },
  nitro: {
    preset: "vercel",
  },
});