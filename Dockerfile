# LyricVibe Remotion Render Server
# 使用 Remotion 官方模板为基础，适配国内环境
FROM node:20-slim

# 安装 Chromium 依赖（Remotion SSR 需要）
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 设置 Chromium 路径环境变量
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium

# 创建工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖（使用淘宝镜像加速）
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci

# 复制项目源码
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/

# 构建 Next.js（生成静态资源，render server 需要）
RUN npm run build

# 复制 render-server 代码
COPY render-server/ ./render-server/

# 安装 render-server 依赖
WORKDIR /app/render-server
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

WORKDIR /app

# 暴露端口
EXPOSE 3000

# 启动渲染服务器
CMD ["node", "render-server/index.js"]
