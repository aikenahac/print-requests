import type { NextConfig } from "next";

const devTunnelHost = process.env.DEV_TUNNEL_HOST ?? "59d3c71fcca2.ngrok.app";

const nextConfig: NextConfig =
  process.env.NODE_ENV === "development"
    ? {
        allowedDevOrigins: [devTunnelHost],
        experimental: {
          serverActions: { allowedOrigins: [devTunnelHost] },
        },
      }
    : {};

export default nextConfig;
