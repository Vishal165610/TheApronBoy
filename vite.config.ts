// @lovable.dev/vite-tanstack-config already includes standard plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      // ssr.external only accepts string[] | true (no RegExp) in this
      // Vite/Rolldown version — plain package names are fine here since
      // Vite resolves externals at the package level (covers subpaths
      // like "firebase-admin/app" automatically).
      external: ["firebase-admin"],
    },
    build: {
      rollupOptions: {
        // Rollup/Rolldown's external DOES need the regex form to catch
        // deep imports like "firebase-admin/app" and "firebase-admin/auth"
        // — a plain string only matches the exact bare specifier.
        external: [/^firebase-admin(\/.*)?$/],
      },
    },
  },
  nitro: {
    preset: "vercel",
    // Two things had to be true together, which earlier attempts only had
    // one of at a time:
    //  1. firebase-admin must be fully EXTERNAL from Vite's bundle — even
    //     with the commonJS interop option set, Nitro's shared "_libs"
    //     chunk (deduped across multiple server functions) still bundled
    //     a broken copy of it ("Cannot read properties of undefined
    //     (reading 'SDK_VERSION')"). Bundling it at all hits this, in at
    //     least one of the code paths, no matter the interop setting.
    //  2. Nitro v3 must be told to actually TRACE and copy the real
    //     firebase-admin package files into the deployed function once
    //     it's external — otherwise the external import resolves to
    //     nothing at runtime ("Cannot find package 'firebase-admin'").
    // mongodb is deliberately left OUT of both lists — it was never
    // actually broken; an earlier assumption that "same class of package,
    // externalize both defensively" caused it to break unnecessarily.
    // Left to its default (bundled normally), it's fine.
    traceDeps: ["firebase-admin"],
  },
});
