import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E 与普通开发/构建使用不同输出目录，避免并发验证互相覆盖缓存。
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
