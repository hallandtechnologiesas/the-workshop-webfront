import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: process.env.REPLIT_DEV_DOMAIN 
        ? [`https://${process.env.REPLIT_DEV_DOMAIN}`]
        : ['*'],
    },
  },
  allowedDevOrigins: process.env.REPLIT_DEV_DOMAIN 
    ? [`${process.env.REPLIT_DEV_DOMAIN}`]
    : ['*'],
};

export default nextConfig;
