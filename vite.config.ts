// @lovable.dev/vite-tanstack-config already includes standard plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Packages that must NOT be bundled into the server output — Vite/Rolldown
// mangle firebase-admin and mongodb's internal module structure when they
// try to inline them, causing runtime errors like
// "Cannot read properties of undefined (reading 'SDK_VERSION')".
// Node.js on Vercel loads these fine directly from node_modules, so we just
// need to keep them external instead of bundled.
//
// NOTE: these two `external` options are two different underlying bindings
// in this Vite/Rolldown setup and accept different types:
//   - ssr.external              -> string[] | true   (NO RegExp allowed)
//   - build.rollupOptions.external -> string | RegExp (a plain string here
//                                     would miss subpath imports like
//                                     "firebase-admin/app")
// Package-name-only strings are fine for ssr.external since Vite resolves
// externals there at the package level (covers all its subpath imports
// automatically); Rollup's bundler-level external needs the regex to catch
// those same subpaths explicitly.
const ssrExternalPackages = ["firebase-admin", "mongodb"];
const rollupExternalPatterns = [/^firebase-admin(\/.*)?$/, /^mongodb(\/.*)?$/];

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      external: ssrExternalPackages,
    },
    build: {
      rollupOptions: {
        external: rollupExternalPatterns,
      },
    },
  },
  nitro: {
    preset: "vercel",
  },
});