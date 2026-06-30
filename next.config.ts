import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizeCss: true,
  },
};

module.exports = {
  allowedDevOrigins: ["172.20.10.7"],
};

export default nextConfig;
