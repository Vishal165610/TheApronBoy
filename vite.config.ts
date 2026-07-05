// @lovable.dev/vite-tanstack-config already includes standard plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Packages that must NOT be bundled into the server output — Vite/Rollup
// mangle firebase-admin and mongodb's internal module structure when they
// try to inline them, causing runtime errors like
// "Cannot read properties of undefined (reading 'SDK_VERSION')".
// Node.js on Vercel loads these fine directly from node_modules, so we just
// need to keep them external instead of bundled.
const serverOnlyExternals = ["firebase-admin", "mongodb"];

// Rollup's `external` only does exact specifier matching by default, so
// "firebase-admin" alone would NOT externalize deep imports like
// "firebase-admin/app" or "firebase-admin/auth" (which firebase-admin.ts
// actually imports). Vite's ssr.external matches at the package level
// already, but we use the same matcher function for both to be safe.
function isServerOnlyExternal(id: string): boolean {
  return serverOnlyExternals.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
}

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
        // Keeps the import statements completely separate from the bundle
        // output — must be a function to also catch subpath imports like
        // "firebase-admin/app" and "firebase-admin/auth".
        external: isServerOnlyExternal,
      },
    },
  },
  nitro: {
    preset: "vercel",
  },
});