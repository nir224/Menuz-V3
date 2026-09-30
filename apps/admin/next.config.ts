import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@menuz/core"],
  async rewrites() {
    return [{ source: "/menuz-api/:path*", destination: "http://127.0.0.1:43121/api/v1/:path*" }];
  },
};

export default nextConfig;
