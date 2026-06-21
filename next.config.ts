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

  // Turbopack 配置：减少开发时不必要的重编译
  turbopack: {
    // 排除 Remotion 相关目录，减少 HMR 触发
    resolveAlias: {},
  },

  // 减少不必要的文件监听
  webpack: (config, { isServer }) => {
    // 排除 Remotion 的 native 模块和大型依赖
    if (isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/@remotion/**',
          '**/node_modules/puppeteer/**',
          '**/public/output/**',
          '**/.next/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
