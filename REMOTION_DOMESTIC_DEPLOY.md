# Remotion 国内部署方案 (AWS Lambda 替代)

## 概述

AWS Lambda 需要国际信用卡且国内访问延迟高。本文提供 3 种国内可行的替代方案，从简单到生产级排列。

---

## 方案对比

| 方案 | 难度 | 费用 | 延迟 | 适用场景 |
|------|------|------|------|----------|
| **A. 本地 CLI 渲染** | ⭐ 零配置 | 免费 | 本地 | 开发调试、少量视频 |
| **B. Docker 自建渲染服务** | ⭐⭐ | 服务器费用 | 低 | 小团队、API 化渲染 |
| **C. 阿里云函数计算 FC** | ⭐⭐⭐ | 按量付费 | 中 | 弹性伸缩、Serverless |

---

## 方案 A：本地 CLI 渲染（零依赖，立即可用）

### 原理
Remotion 自带 CLI 工具，可以直接在本地通过命令行渲染 MP4，无需任何云服务。

### 跑通示例

```bash
cd /Users/guanz/hack/LyricVibe

# 1. 安装 Remotion CLI（已安装可跳过）
npm install @remotion/cli

# 2. 启动 Remotion Studio 预览
npx remotion studio src/lib/remotion/index.ts

# 3. 渲染一个 MP4 视频
npx remotion render LyricVibeVideo out/demo.mp4 \
  --props='{"videoUrl":"","lyrics":[{"start":0,"end":3,"text":"🎵 Hello World","id":"1"},{"start":3,"end":6,"text":"这是 Remotion 渲染的视频","id":"2"},{"start":6,"end":9,"text":"无需 AWS 即可运行","id":"3"}],"styleParams":{"fontFamily":"sans-serif","fontSize":64,"color":"#ffffff","animation":"fade-in"},"filter":"none"}' \
  --codec=h264
```

### 集成到 API

`/api/render` 可以直接调用 `@remotion/renderer` 的 SSR API 本地渲染，见下文「方案 B 进阶」。

---

## 方案 B：Docker 自建渲染服务（推荐）

### 架构

```
┌─────────────────┐     POST /api/render      ┌──────────────────┐
│   Next.js 前端   │ ────────────────────────→ │  Render Server   │
│  (lyricvibe)    │ ←─────── download URL ──── │  (Express.js)    │
└─────────────────┘                            │  + Remotion SSR  │
                                               │  + Chromium      │
                                               └──────────────────┘
```

### B.1 本地 Docker 跑通示例

#### 第 1 步：创建 Dockerfile

项目根目录已包含 Dockerfile（见下方代码）。构建并运行：

```bash
# 构建镜像
docker build -t lyricvibe-renderer .

# 运行容器（映射 3000 端口）
docker run -d -p 3000:3000 --name lyricvibe-render lyricvibe-renderer

# 测试渲染 API
curl -X POST http://localhost:3000/renders \
  -H "Content-Type: application/json" \
  -d '{
    "inputProps": {
      "videoUrl": "",
      "lyrics": [
        {"start":0,"end":3,"text":"🎵 测试歌词第一句","id":"1"},
        {"start":3,"end":6,"text":"通过 Docker 渲染","id":"2"},
        {"start":6,"end":9,"text":"完全无需 AWS","id":"3"}
      ],
      "styleParams": {
        "fontFamily": "sans-serif",
        "fontSize": 64,
        "color": "#ffffff",
        "animation": "karaoke"
      },
      "filter": "none"
    },
    "composition": "LyricVibeVideo",
    "codec": "h264"
  }'

# 查看渲染状态
curl http://localhost:3000/renders/<renderId>

# 下载渲染结果
curl -O http://localhost:3000/renders/<renderId>/output.mp4
```

#### 第 2 步：推送到阿里云/腾讯云服务器

```bash
# 方式一：推送到阿里云容器镜像服务 ACR（国内快）
# 1. 在阿里云控制台创建容器镜像仓库
# 2. 登录并推送
docker login --username=<阿里云账号> registry.cn-hangzhou.aliyuncs.com
docker tag lyricvibe-renderer registry.cn-hangzhou.aliyuncs.com/<namespace>/lyricvibe-renderer:latest
docker push registry.cn-hangzhou.aliyuncs.com/<namespace>/lyricvibe-renderer:latest

# 方式二：直接在阿里云 ECS 上构建
# 将代码 scp 到 ECS，然后 docker build
scp -r /Users/guanz/hack/LyricVibe root@<ECS_IP>:/app/
ssh root@<ECS_IP> "cd /app && docker build -t lyricvibe-renderer . && docker run -d -p 3000:3000 lyricvibe-renderer"
```

### B.2 阿里云 ECS 配置建议

| 配置项 | 建议值 | 月费用 |
|--------|--------|--------|
| 实例规格 | ecs.c7.xlarge (4vCPU 8GB) | ~¥300/月 |
| 系统盘 | 40GB 高效云盘 | ~¥14/月 |
| 带宽 | 按量 5Mbps | ~¥115/月 |
| **总计** | | **~¥430/月** |

> 💡 更省钱：ecs.c7.large (2vCPU 4GB) ~¥150/月，渲染稍慢但够用

---

## 方案 C：阿里云函数计算 FC

### 原理
阿里云 FC 是 AWS Lambda 的国内对应产品，支持 Node.js 运行时 + 自定义容器 + Chromium 层。

### C.1 使用阿里云 FC 公共层（Puppeteer/Chromium）

阿里云 FC 提供了官方的 **Puppeteer 公共层**，包含 Chromium，可以直接使用。

#### 步骤概览：

1. **安装 Serverless Devs 工具**
```bash
npm install -g @serverless-devs/s
s config add  # 配置阿里云 AccessKey
```

2. **创建 s.yaml 配置文件**（见项目中的 `s.yaml`）

3. **部署**
```bash
s deploy
```

### C.2 关键差异 vs AWS Lambda

| AWS Lambda | 阿里云 FC |
|------------|-----------|
| `@remotion/lambda` | ❌ 不支持（仅 AWS） |
| 渲染方式 | 通过 `@remotion/renderer` SSR API + Puppeteer |
| 函数超时 | 最长 600s (10分钟) |
| 内存 | 最大 32GB |
| Chromium | 通过公共层 `acs:puppeteer` 提供 |

> ⚠️ 注意：阿里云 FC 不能直接使用 `@remotion/lambda`（该包专为 AWS 设计），但可以通过 `@remotion/renderer` 的 SSR API + Puppeteer 实现相同效果。

### C.3 示例代码（阿里云 FC 函数）

```typescript
// fc-render/index.ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";

exports.handler = async (event, context) => {
  const body = JSON.parse(event.body || "{}");
  const { inputProps } = body;

  // 1. Bundle Remotion 项目
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "../src/lib/remotion/index.ts"),
  });

  // 2. 选择 composition
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "LyricVibeVideo",
    inputProps,
  });

  // 3. 渲染
  const outputPath = `/tmp/output.mp4`;
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
  });

  // 4. 上传到 OSS 并返回 URL
  // ... 上传逻辑

  return {
    statusCode: 200,
    body: JSON.stringify({ url: "https://oss.aliyuncs.com/..." }),
  };
};
```

---

## 推荐路径

```
第 1 步：方案 A（本地 CLI 渲染）
  → 验证 Remotion 能正确渲染你的 Composition
  → 无需任何云服务，5 分钟跑通

第 2 步：方案 B（Docker 自建）
  → 适合有国内服务器的情况
  → 成本可控，延迟低
  → 可以随时扩展为 API 服务

第 3 步：方案 C（阿里云 FC）
  → 需要弹性伸缩时使用
  → 按量付费，零运维
```

---

## 与 AWS Lambda 方案的对比

| 维度 | AWS Lambda | 国内方案 |
|------|-----------|----------|
| 信用卡 | 需要国际信用卡 | 支付宝/微信支付 |
| 网络延迟 | 200-500ms (海外) | < 50ms (国内) |
| 合规 | 数据出境风险 | 数据在国内 |
| SDK | `@remotion/lambda` 专用 | 通用 SSR API |
| 分布式渲染 | ✅ 内置支持 | ⚠️ 需自行实现 |
| 弹性伸缩 | ✅ 自动 | Docker: 手动 / FC: 自动 |

---

## 快速验证清单

- [ ] `npx remotion studio src/lib/remotion/index.ts` 能在浏览器预览
- [ ] `npx remotion render LyricVibeVideo out/test.mp4` 能渲染出 MP4
- [ ] Docker 方案：`docker build && docker run` 后 API 可调用
- [ ] FC 方案：`s deploy` 后函数 URL 可访问

---

## 相关文件

- `Dockerfile` - Docker 自建渲染服务镜像
- `render-server/` - Express.js 渲染服务器代码
- `REMOTION_LAMBDA_GUIDE.md` - AWS Lambda 原始方案（参考）
