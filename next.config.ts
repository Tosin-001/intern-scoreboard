import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root explicitly — there's a stray package-lock.json
  // one level up (C:\Users\...\package-lock.json, outside this project)
  // that otherwise makes Next.js misdetect the monorepo root and warn on
  // every dev/build.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
