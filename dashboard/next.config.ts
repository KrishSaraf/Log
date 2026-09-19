import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app deliberately sits outside the repo's pnpm workspace and uses npm.
  // Pinning the tracing root stops Next from walking up to the root lockfile.
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["pg"],
  // Phone camera uploads (FormData / JSON base64) can be a few MB after compress.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
