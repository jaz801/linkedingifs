// Bugfix: ensure Lightning CSS falls back to WASM when native bindings are unavailable.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

process.env.CSS_TRANSFORMER_WASM ??= "1";

const projectRoot = dirname(fileURLToPath(import.meta.url));

process.env.TURBOPACK_ROOT ??= projectRoot;

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
