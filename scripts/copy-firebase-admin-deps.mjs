// Runs automatically after `npm run build` (npm's built-in "postbuild"
// convention — no Vercel project settings need to change).
//
// WHY THIS EXISTS: firebase-admin must be kept external from the Vite/
// Rolldown bundle (bundling it breaks at runtime with "Cannot read
// properties of undefined (reading 'SDK_VERSION')" — a real bug we hit and
// confirmed). But once external, Nitro v3's `traceDeps` config option
// (which is supposed to copy an external package's real files into the
// deployed function) was confirmed, across two separate live deploys, to
// NOT actually copy anything — the external import then resolves to
// nothing at runtime instead ("Cannot find package 'firebase-admin'").
//
// So: we copy firebase-admin and its full dependency tree ourselves,
// directly from the root node_modules into the built function's
// node_modules, walking each package's own declared "dependencies" so
// transitive packages (e.g. google-auth-library, @grpc/grpc-js, etc.) come
// along too. This is deterministic and easy to verify locally with
// `vercel build` — no dependence on Nitro's tracer behaving correctly.
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const rootNodeModules = join(root, "node_modules");
const functionDir = join(root, ".vercel", "output", "functions", "__server.func");
const destNodeModules = join(functionDir, "node_modules");

function packagePath(base, name) {
  // Handles scoped packages like "@grpc/grpc-js" -> node_modules/@grpc/grpc-js
  return join(base, ...name.split("/"));
}

function copyPackage(name, seen) {
  if (seen.has(name)) return;
  seen.add(name);

  const src = packagePath(rootNodeModules, name);
  if (!existsSync(src)) {
    console.warn(`[copy-firebase-admin-deps] not found in node_modules, skipping: ${name}`);
    return;
  }

  const dest = packagePath(destNodeModules, name);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: true, force: true });
  console.log(`[copy-firebase-admin-deps] copied ${name}`);

  const pkgJsonPath = join(src, "package.json");
  if (existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const deps = { ...(pkg.dependencies || {}) };
    for (const dep of Object.keys(deps)) {
      copyPackage(dep, seen);
    }
  }
}

if (!existsSync(functionDir)) {
  // Not a Vercel build (e.g. running `npm run build` for something else) —
  // nothing to do.
  console.log("[copy-firebase-admin-deps] no .vercel/output function found, skipping");
  process.exit(0);
}

const seen = new Set();
copyPackage("firebase-admin", seen);
copyPackage("json-bigint", seen); // Force-inject json-bigint to the output
console.log("[copy-firebase-admin-deps] done");