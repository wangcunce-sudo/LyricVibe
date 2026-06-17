# 🎬 LyricVibe — AI 个性化歌词字幕 MV 生成器

<div align="center">

**上传视频 + 音频 → AI 听懂歌词情绪 → 自动生成完美字幕 → 一键导出 MP4**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Remotion](https://img.shields.io/badge/Remotion-4.0-0b84f3)](https://remotion.dev)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)

</div>

---

## ✨ 这是什么？

**LyricVibe** 是一个面向大众用户的 AI 歌词字幕 MV 生成器。你只需要：
- 🎥 拖入一段视频（或直接用 Demo）
- 🎵 拖入一段音频
- 🤖 AI 自动分析歌词情绪和主题
- 🎨 AI 生成匹配的字幕样式（字体、颜色、动画）
- 🎬 **一键导出高质量 MP4**

不同于剪映的固定模板，LyricVibe 的 AI 会 **理解歌词内容**，生成与之呼应的字幕风格。也不同于 Neural Frames 等面向音乐人的专业工具，LyricVibe **零门槛、即时可用**。

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Python 3** + **Demucs** + **faster-whisper**（可选，用于本地 WhisperX 歌词识别）

### 1. 克隆 & 安装

```bash
git clone https://github.com/wangcunce-sudo/LyricVibe.git
cd lyricvibe
npm install
```

### 2. 配置 AI API Key

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入你的 AI API Key（三选一即可）：

```env
# 推荐：DeepSeek（性价比最高）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxx

# 或者 OpenAI
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxx

# 或者 Anthropic Claude
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

> 💡 首页会自动加载 Demo 视频和音频，点击"Try Demo"即可零配置体验全流程。

---

## 🎥 视频渲染

### 方式一：网站内一键导出（推荐）

在 `/create` 页面点击右上角 **"导出视频"** 按钮，Remotion SSR 会在服务端渲染并自动下载。

### 方式二：Remotion Studio 预览 & 导出

```bash
npm run studio
```

启动 Remotion Studio，可在浏览器中预览 composition、调整参数，并通过 GUI 导出。

### 方式三：命令行渲染

```bash
# 渲染 Demo 视频
npm run render-demo

# 自定义渲染
npx remotion render src/lib/remotion/index.ts LyricVibeVideo out/my_video.mp4
```

---

## 🐳 Docker 部署

```bash
# 一键启动（Next.js 前端 + Remotion 渲染服务）
docker compose up -d

# 访问
open http://localhost:3000
```

---

## 🏗️ 技术架构

| 层 | 技术 | 用途 |
|---|---|---|
| **前端框架** | Next.js 16 + React 19 | 全栈应用框架 |
| **UI 样式** | Tailwind CSS 4 + Radix UI | 组件与样式 |
| **视频渲染** | Remotion 4 | React 驱动的视频渲染引擎 |
| **前端预览** | `@remotion/player` + Canvas | 实时歌词字幕预览 |
| **AI 分析** | OpenAI / DeepSeek / Anthropic | 歌词情感分析 + 风格生成 |
| **语音识别** | WhisperX (Demucs + faster-whisper) | 高精度歌词时间轴提取 |
| **音频引擎** | Tone.js | 变速变调 + 时间拉伸 |
| **服务端渲染** | Puppeteer + Remotion SSR | 服务端视频合成 |
| **输入验证** | Zod | API 边界类型安全 |
| **类型系统** | TypeScript 5 | 全量类型覆盖 |

### 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # 首页
│   ├── create/page.tsx       # 创作工作台
│   └── api/                  # API 路由
│       ├── analyze/          # AI 歌词分析
│       ├── render/           # Remotion 视频渲染
│       ├── template/         # 自然语言 → 字幕模板
│       ├── transcribe/       # WhisperX 歌词识别
│       └── upload/           # 文件上传
├── lib/
│   ├── remotion/             # Remotion 视频组件
│   │   ├── Composition.tsx   # 主视频合成
│   │   ├── SubtitleComposition.tsx  # 字幕渲染（共享前端+后端）
│   │   ├── DemoVideo.tsx     # 50秒全流程 Demo 视频
│   │   └── Root.tsx          # Remotion 注册入口
│   ├── ai-service.ts         # AI 服务（多 provider 支持）
│   ├── tone-engine.ts        # Tone.js 音频引擎
│   ├── canvas-renderer.ts    # Canvas 字幕渲染器
│   ├── speech-service.ts     # 浏览器语音识别
│   ├── validation.ts         # Zod 输入验证
│   └── i18n/                 # 中英文国际化
├── components/
│   ├── ControlPanel.tsx      # 控制面板（样式/滤镜/速度/音高）
│   ├── VideoPreview.tsx      # 视频预览 + Remotion Player
│   ├── FileUpload.tsx        # 拖拽上传组件
│   └── SpeechRecorder.tsx    # 语音录制组件
└── ...
```

---

## 🔥 核心功能

### 1. 🤖 AI 歌词理解 & 风格生成

AI 分析歌词中的情绪（喜悦/忧伤/愤怒/浪漫等 8 种）和主题，自动生成一套与之匹配的字幕样式——字体、颜色、动画、装饰。你也可以用**自然语言**描述想要的风格：

> *"深色哥特风衬线字体，血红强调色，戏剧化的卡拉 OK 高亮动画"*

AI 会将其转化为实际渲染参数。

### 2. 🎤 WhisperX 高精度歌词时间轴

上传音频后，WhisperX 使用 **Demucs 音源分离 + faster-whisper large-v3** 提取逐字级别的时间戳，精确对齐每个词的出入点，实现逐词弹跳动效。

### 3. 🎨 7 种字幕动画 + 8 种滤镜

- **动画**：kinetic-pop（逐词弹跳）、fade-in、slide-up、bounce、scale-up、karaoke（高亮扫过）、typewriter
- **滤镜**：original、vintage（复古）、film（胶片）、fresh（清新）、bw（黑白）、warm（暖调）、cool（冷调）、faded（褪色）

### 4. 🎵 变速 & 变调

0.5x–2x 变速（Tone.js 时间拉伸） + ±12 半音变调，字幕时间轴自动同步。

### 5. 🎬 Remotion 视频渲染

前后端共享 100% 相同的 React 字幕组件，前端预览与后端导出效果一致。支持 1920×1080、1080×1920 等多种分辨率。

### 6. 🌍 中英文双语

完整的 i18n 支持，一键切换中文/English。

---

## 📸 截图

| 首页 | 创作工作台（Demo 加载后） |
|:---:|:---:|
| ![首页](screenshots/homepage.png) | ![Demo](screenshots/demo-loaded.png) |

| 滤镜面板 | 高级设置 |
|:---:|:---:|
| ![滤镜](screenshots/filter-tab.png) | ![高级](screenshots/advanced-tab.png) |

---

## 🎯 与竞品的差异

| | 剪映/CapCut | Neural Frames 等 | **LyricVibe** |
|---|---|---|---|
| 面向用户 | 视频创作者 | 独立音乐人 | **普通大众** |
| AI 歌词理解 | ❌ 无 | ❌ 无 | ✅ 情绪+主题分析 |
| 自然语言生成风格 | ❌ | ❌ | ✅ |
| 用户上传视频 | ✅ | ❌ | ✅ |
| 学习门槛 | 中 | 高 | **零** |
| 即时可用 | 需下载 App | 需注册付费 | ✅ 网页即用 |

---

## 🗺️ 路线图

- [x] AI 歌词情绪分析 + 风格生成
- [x] WhisperX 高精度歌词时间轴
- [x] 7 种字幕动画 + 逐词弹跳
- [x] 8 种视频滤镜
- [x] Tone.js 变速变调
- [x] Remotion SSR 服务端渲染
- [x] Docker 一键部署
- [x] 中英文国际化
- [ ] 更多字幕布局模板（多行、对话式）
- [ ] 用户账号 & 历史记录
- [ ] Remotion Lambda 云端弹性渲染

---

## 📄 License

MIT © LyricVibe
