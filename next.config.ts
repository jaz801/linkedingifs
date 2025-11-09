import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      externalPackages: ['@napi-rs/canvas', 'canvas', 'gif-encoder-2'],
    },
  },
};

export default nextConfig;
