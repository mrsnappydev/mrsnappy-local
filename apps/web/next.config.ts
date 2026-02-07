import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network access during development
  allowedDevOrigins: [
    "http://192.168.*.*",
    "http://localhost:*",
    "http://127.0.0.1:*",
  ],
};

export default nextConfig;
