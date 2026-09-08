import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Standalone output is only needed for self-hosted Docker containers, not Vercel */
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
