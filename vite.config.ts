// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Pass standard Vite overrides directly here
  vite: {
    ssr: {
      // Prevents Vite/Rolldown from parsing and breaking firebase-admin internals
      // Using explicit string paths to support strict Rolldown config specifications
      external: [
        "firebase-admin",
        "firebase-admin/app",
        "firebase-admin/auth"
      ],
      noExternal: [],
    },
  },
  // Explicitly tell Nitro we are deploying on Vercel, not Cloudflare
  nitro: {
    preset: "vercel",
    // Ensure the engine marks firebase-admin as an external production trace dependency
    externals: {
      inline: [],
      external: ["firebase-admin"],
    },
  },
});