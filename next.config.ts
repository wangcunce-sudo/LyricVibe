import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remotion 服务端渲染需要将以下包标记为外部依赖
  // 避免 Next.js 在客户端打包时尝试 bundle 它们
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "remotion",
    "puppeteer",
  ],
};

export default nextConfig;
