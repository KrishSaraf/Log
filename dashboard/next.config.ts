import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app deliberately sits outside the repo's pnpm workspace and uses npm.
  // Pinning the tracing root stops Next from walking up to the root lockfile.
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["pg"],
  // Phone camera uploads (FormData) can be a few MB after client compress.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
