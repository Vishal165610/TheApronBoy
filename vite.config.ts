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
    // Vite's ssr.external above stops these from being bundled into ssr.mjs
    // (that part now works — confirmed by the "Cannot find package" errors,
    // which show a clean `import "mongodb"` reaching the runtime). But
    // Nitro is what actually packages the serverless function for Vercel,
    // and it has its own separate tracer (using @vercel/nft) that decides
    // which node_modules files to copy into the deployed function. Without
    // this, it never copies firebase-admin/mongodb's files at all, so the
    // external import resolves to nothing at runtime.
    //
    // `as any` here: @lovable.dev/vite-tanstack-config's TypeScript types
    // don't seem to declare `externals` on the nitro config, even though
    // Nitro itself fully supports the option at runtime. This is a type
    // definition gap in the wrapper, not an invalid config.
    externals: {
      external: ["firebase-admin", "mongodb"],
      trace: true,
    },
  } as any,
});