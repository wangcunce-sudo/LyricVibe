# LyricVibe 待办事项指引文档

> 本文档详细列出了 LyricVibe 项目中所有待实现的功能，并提供逐步解决方案。
> 每个任务按优先级排列，附带完整代码示例。

---

## 目录

1. [接入 Whisper 歌词识别](#1-接入-whisper-歌词识别--用户上传模式)
2. [完成 Remotion 服务端视频渲染](#2-完成-remotion-服务端视频渲染)
3. [配置 AI API Key 环境变量](#3-配置-ai-api-key-环境变量)
4. [接入 Tone.js 音频变调](#4-接入-tonejs-音频变调)
5. [安装 @remotion/cli 启用本地预览](#5-安装-remotioncli-启用本地预览)
6. [修复用户上传模式的歌词分析](#6-修复用户上传模式的歌词分析)
7. [增强 VideoPreview Canvas 功能](#7-增强-videopreview-canvas-功能)
8. [支持动态元数据更新（标题）](#8-支持动态元数据更新标题)

---

## 1. 接入 Whisper 歌词识别 — 用户上传模式

**优先级**: 🔴 最高
**现状**: 用户上传音频后，`handleAnalyze` 直接使用 `OPHELIA_LYRICS`（Demo 歌词），没有真正的音频转歌词功能。

### 方案 A：OpenAI Whisper API（推荐）

**文件**: `src/app/api/analyze/route.ts`

在分析歌词前，先调用 Whisper API 进行语音识别：

```typescript
// 新增: 在 src/app/api/analyze/route.ts 中添加
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// 修改 POST handler，接收 audioUrl 参数
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lyrics, audioUrl } = body as { lyrics?: LyricLine[]; audioUrl?: string };

    let finalLyrics: LyricLine[];

    if (lyrics && lyrics.length > 0) {
      finalLyrics = lyrics;
    } else if (audioUrl) {
      // 步骤 0：从音频转录歌词
      finalLyrics = await transcribeAudio(audioUrl);
    } else {
      return NextResponse.json(
        { error: "Lyrics or audioUrl is required" },
        { status: 400 }
      );
    }

    // 步骤 1：分析歌词
    const analysis = await analyzeLyrics(finalLyrics);
    // ... 后续不变
  }
}

// 新增函数
async function transcribeAudio(audioUrl: string): Promise<LyricLine[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY required for transcription");

  // 下载音频文件到临时目录
  const response = await fetch(audioUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const tmpPath = join(tmpdir(), `audio-${Date.now()}.mp3`);
  await writeFile(tmpPath, buffer);

  // 调用 Whisper
  const formData = new FormData();
  formData.append("file", new Blob([buffer]), "audio.mp3");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");  // 带时间戳
  formData.append("language", "en");  // 或自动检测

  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const data = await whisperRes.json();

  // 转换为 LyricLine[]
  return data.segments.map((seg: any, i: number) => ({
    index: i,
    text: seg.text.trim(),
    startTime: seg.start,
    endTime: seg.end,
    confidence: seg.confidence || 0,
  }));
}
```

**前端修改**: `src/app/create/page.tsx`

```typescript
// 在 handleAnalyze 中，将 audioUrl 传给 API
const response = await fetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    audioUrl: audioFile?.url,   // 传入音频 URL
    lyrics: null,               // 让后端从音频中提取
  }),
});
```

### 方案 B：浏览器端 Web Speech API（免费，无需 API Key）

**优点**: 免费、无延迟
**缺点**: 准确性不如 Whisper，不支持所有浏览器

在 `src/app/create/page.tsx` 中添加：

```typescript
// 浏览器端语音识别
async function transcribeInBrowser(audioUrl: string): Promise<LyricLine[]> {
  const audio = new Audio(audioUrl);
  const audioContext = new AudioContext();
  const source = audioContext.createMediaElementSource(audio);

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;

  return new Promise((resolve) => {
    const results: LyricLine[] = [];
    recognition.onresult = (event: any) => {
      for (let i = 0; i < event.results.length; i++) {
        results.push({
          index: i,
          text: event.results[i][0].transcript,
          startTime: i * 3,  // 粗略估算
          endTime: (i + 1) * 3,
        });
      }
    };
    recognition.onend = () => resolve(results);
    recognition.start();
    audio.play();
  });
}
```

---

## 2. 完成 Remotion 服务端视频渲染

**优先级**: 🔴 最高
**现状**: `/api/render` 是占位实现，Export 按钮下载的是原始音频文件。

### 步骤 1：安装依赖

```bash
cd /Users/guanz/hack/LyricVibe
npm install @remotion/cli@^4.0.477
```

### 步骤 2：配置 Remotion bundle

创建 `src/lib/remotion/webpack-override.ts`（如果不存在，Remotion 会用默认配置）：

```typescript
// src/lib/remotion/webpack-override.ts
import { WebpackOverrideFn } from "@remotion/bundler";

export const webpackOverride: WebpackOverrideFn = (currentConfiguration) => {
  return {
    ...currentConfiguration,
    module: {
      ...currentConfiguration.module,
      rules: [
        ...(currentConfiguration.module?.rules || []),
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
  };
};
```

### 步骤 3：重写 `/api/render` 路由

```typescript
// src/app/api/render/route.ts (完全重写)
import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import os from "os";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      audioUrl,
      lyrics,
      styleParams,
      filter,
      speed,
      pitch,
      videoUrl,
    } = body;

    if (!audioUrl || !lyrics || lyrics.length === 0) {
      return NextResponse.json(
        { error: "audioUrl and lyrics are required" },
        { status: 400 }
      );
    }

    // 1. 下载音频文件到本地（Remotion renderer 需要本地文件路径）
    const audioRes = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const audioPath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    // 2. Bundle Remotion 项目
    const entry = path.resolve(process.cwd(), "src/lib/remotion/index.ts");
    const bundled = await bundle({
      entryPoint: entry,
      webpackOverride: (config) => config,  // 使用默认配置
    });

    // 3. 选择 composition
    const compositionId = "LyricVibe";
    const inputProps = {
      lyrics,
      styleParams,
      filter,
      speed,
      pitch,
      audioUrl: audioPath,
      videoUrl: videoUrl || null,
    };

    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      inputProps,
    });

    // 4. 渲染视频
    const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      onProgress: (progress) => {
        console.log(`Rendering: ${Math.round(progress.progress * 100)}%`);
      },
    });

    // 5. 读取渲染结果并返回
    const outputBuffer = fs.readFileSync(outputPath);

    // 清理临时文件
    fs.unlinkSync(audioPath);
    fs.unlinkSync(outputPath);

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="lyricvibe-video.mp4"',
      },
    });
  } catch (error) {
    console.error("Render error:", error);
    return NextResponse.json(
      { error: "Rendering failed: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export const maxDuration = 300; // 5 分钟
```

### 步骤 4：更新 Remotion Composition

确保 `src/lib/remotion/Composition.tsx` 接收完整的 `inputProps` 并渲染字幕：

```typescript
// src/lib/remotion/Composition.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio } from "remotion";

interface Props {
  lyrics: { text: string; startTime: number; endTime: number }[];
  styleParams: {
    fontFamily: string;
    fontSize: number;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    animation: string;
    fontWeight: number;
    textShadow: boolean;
  };
  filter: string;
  audioUrl: string;
  videoUrl?: string | null;
}

export const LyricVibeComposition: React.FC<Props> = ({
  lyrics,
  styleParams,
  filter,
  audioUrl,
  videoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // 找到当前歌词行
  const currentLine = lyrics.find(
    (l) => currentTime >= l.startTime && currentTime < l.endTime
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <Audio src={audioUrl} />
      {currentLine && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: "15%",
          }}
        >
          <SubtitleRenderer
            text={currentLine.text}
            progress={
              (currentTime - currentLine.startTime) /
              (currentLine.endTime - currentLine.startTime)
            }
            styleParams={styleParams}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
```

### 替代方案：Remotion Lambda（云端渲染）

如果本地渲染太慢，可以使用 Remotion Lambda 进行云端渲染：

```bash
npm install @remotion/lambda
```

```typescript
// 使用 Remotion Lambda 渲染
import { renderMediaOnLambda } from "@remotion/lambda";

const { url } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName: "remotion-render",
  serveUrl: bundled,
  composition: compositionId,
  inputProps,
  codec: "h264",
  framesPerLambda: 20,
});
```

> **注意**: Remotion Lambda 需要 AWS 账号和相应配置，详见 https://remotion.dev/docs/lambda

---

## 3. 配置 AI API Key 环境变量

**优先级**: 🟡 高
**现状**: 未设置 API Key，AI 分析使用固定 fallback 数据。

### 步骤

1. 在项目根目录创建 `.env.local` 文件：

```bash
# 二选一即可

# 方案 A：OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# 方案 B：Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

2. 获取 API Key：
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Anthropic**: https://console.anthropic.com/

3. 重启开发服务器后生效：

```bash
npm run dev
```

### 验证

设置 API Key 后，AI 分析会从 fallback 模式切换到真实 AI 模式：
- 歌词情感分析将基于实际歌词内容
- 风格提示词将由 AI 实时生成
- StyleParams 将根据 AI 输出动态解析

### 注意事项

- `.env.local` 已在 `.gitignore` 中，不会被提交到 Git
- 如果没有 API Key，项目仍可正常运行（使用 Demo 数据或 fallback）
- OpenAI 方案成本更低（gpt-4o-mini），推荐用于开发阶段

---

## 4. 接入 Tone.js 音频变调

**优先级**: 🟡 高
**现状**: Audio Tab 的 Pitch slider UI 已就绪，`pitch` 状态已管理，但实际的音频变调未应用到播放。

### 实现方案

**文件**: `src/components/VideoPreview.tsx`

Tone.js 的 `PitchShift` 效果可以在播放时实时变调：

```typescript
import * as Tone from "tone";

// 在 VideoPreview 组件中添加
useEffect(() => {
  const audio = audioRef.current;
  if (!audio || !audioUrl) return;

  // 创建 Tone.js 上下文
  const player = new Tone.Player(audioUrl).toDestination();

  // 创建变调效果
  const pitchShift = new Tone.PitchShift(pitch).toDestination();
  player.connect(pitchShift);

  // 同步播放
  player.sync().start(0);

  // 清理
  return () => {
    player.dispose();
    pitchShift.dispose();
  };
}, [audioUrl, pitch]);
```

### 注意

- Tone.js `PitchShift` 的效果质量取决于参数设置，建议 `windowSize: 0.1`
- 如果音质要求高，可以考虑用 Web Audio API 的 `AudioBufferSourceNode.playbackRate` 做简单的变速变调（但会同时影响速度和音高）
- `tone` 包已在 `package.json` 中安装，无需额外安装

---

## 5. 安装 @remotion/cli 启用本地预览

**优先级**: 🟡 高
**现状**: Remotion 核心库已安装，但没有 CLI 工具无法本地预览视频合成。

### 步骤

```bash
cd /Users/guanz/hack/LyricVibe
npm install @remotion/cli@^4.0.477
```

### 添加启动脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "preview": "remotion studio src/lib/remotion/index.ts"
  }
}
```

### 使用

```bash
# 启动 Remotion Studio（视频合成预览）
npm run preview
```

在 Remotion Studio 中可以：
- 实时预览字幕动画效果
- 逐帧调试动画
- 快速迭代样式参数
- 导出单帧截图

---

## 6. 修复用户上传模式的歌词分析

**优先级**: 🟡 高
**现状**: `src/app/create/page.tsx` 中 `handleAnalyze` 的 else 分支（用户上传模式）直接传入 `OPHELIA_LYRICS` 而非用户实际数据。

### 修复

**文件**: `src/app/create/page.tsx`

```typescript
// 在 handleAnalyze 中，修改 else 分支
const handleAnalyze = useCallback(async () => {
  if (!audioFile && mode !== "demo") return;
  setIsAnalyzing(true);

  try {
    if (mode === "demo") {
      // Demo 模式：使用预置数据
      setLyrics(OPHELIA_LYRICS);
      setAnalysis(OPHELIA_ANALYSIS);
      setStylePrompt(OPHELIA_ANALYSIS.stylePrompt);
      setStyleParams(OPHELIA_STYLE);
    } else {
      // 用户上传模式：调用 API
      // 【修改前】body: JSON.stringify({ lyrics: OPHELIA_LYRICS })  ← 错误！
      // 【修改后】
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: audioFile?.url,     // 传音频 URL 让后端转录
          // lyrics 不传，由后端从音频提取
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLyrics(data.lyrics);              // 从 API 获取真实歌词
        setAnalysis(data.analysis);
        setStylePrompt(data.stylePrompt);
        setStyleParams(data.styleParams);
      }
      // fallback 保持不变...
    }
  }
}, [audioFile, mode]);
```

---

## 7. 增强 VideoPreview Canvas 功能

**优先级**: 🟢 中
**现状**: Canvas 字幕渲染功能完善，但可以进一步增强。

### 建议增强项

#### 7.1 添加装饰元素渲染

在 `src/components/VideoPreview.tsx` 的 `drawLyricLine` 函数末尾，根据 `params.decoration` 渲染装饰：

```typescript
// 在 drawLyricLine 末尾添加
// 渲染装饰元素
if (params.decoration.includes("underline")) {
  const metrics = ctx.measureText(line.text);
  ctx.strokeStyle = params.accentColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - metrics.width / 2, y + fontSize * 0.7);
  ctx.lineTo(x + metrics.width / 2, y + fontSize * 0.7);
  ctx.stroke();
}

if (params.decoration.includes("highlight")) {
  const metrics = ctx.measureText(line.text);
  ctx.fillStyle = params.accentColor;
  ctx.globalAlpha = 0.15;
  ctx.fillRect(
    x - metrics.width / 2,
    y - fontSize * 0.55,
    metrics.width,
    fontSize * 1.2
  );
}

if (params.decoration.includes("border")) {
  const metrics = ctx.measureText(line.text);
  ctx.strokeStyle = params.accentColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  const pad = fontSize * 0.3;
  ctx.strokeRect(
    x - metrics.width / 2 - pad,
    y - fontSize * 0.6 - pad,
    metrics.width + pad * 2,
    fontSize * 1.2 + pad * 2
  );
}
```

#### 7.2 支持多行歌词同时显示

当当前行之前还有活跃歌词时，显示上一行（淡出效果）：

```typescript
// 在 find currentLine 之后
const prevLine = lyrics.find(
  (l) => currentTime >= l.endTime - 0.3 && currentTime < l.endTime
);
// 渲染 prevLine 时使用较低的 opacity
```

---

## 8. 支持动态元数据更新（标题）

**优先级**: 🟢 低
**现状**: `<title>` 和 `<meta>` 在 `layout.tsx` 中写死，语言切换后不更新。

### 方案

由于 Next.js App Router 的 `metadata` 是服务端静态生成的，客户端语言切换无法直接修改它。可以用客户端 JS 动态更新：

```typescript
// 在 I18nProvider 或 LangSwitch 中添加
useEffect(() => {
  const dict = DICT.layout[locale];
  document.title = dict.title;
  document.querySelector('meta[name="description"]')
    ?.setAttribute("content", dict.description);
  document.documentElement.lang = locale;
}, [locale]);
```

---

## 快速开始清单

按顺序执行以下步骤可让项目从 Demo 变为完整可用：

| 步骤 | 任务 | 预计时间 | 依赖 |
|------|------|---------|------|
| 1 | 配置 `.env.local`（AI API Key） | 5 分钟 | 无 |
| 2 | 安装 `@remotion/cli` | 2 分钟 | 无 |
| 3 | 接入 Whisper 歌词识别 | 1-2 小时 | 步骤 1 |
| 4 | 修复用户上传模式歌词分析 | 30 分钟 | 步骤 3 |
| 5 | 完成 Remotion 服务端渲染 | 2-4 小时 | 步骤 2 |
| 6 | 接入 Tone.js 变调 | 1 小时 | 无 |
| 7 | 增强 Canvas 装饰渲染 | 1-2 小时 | 无 |
| 8 | 动态元数据更新 | 30 分钟 | 无 |

---

## 附录：项目文件结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（metadata）
│   ├── ClientLayout.tsx        # 客户端布局（I18nProvider）
│   ├── page.tsx                # 首页
│   ├── globals.css
│   ├── create/
│   │   └── page.tsx            # 创作工作台
│   └── api/
│       ├── analyze/route.ts    # AI 分析 API
│       └── render/route.ts     # 视频渲染 API
├── components/
│   ├── ControlPanel.tsx        # 控制面板（Style/Filter/Audio/Advanced）
│   ├── FileUpload.tsx          # 文件上传组件
│   ├── VideoPreview.tsx        # 视频预览 + Canvas 字幕
│   └── LangSwitch.tsx          # 语言切换按钮
├── lib/
│   ├── ai-service.ts           # AI 分析服务（OpenAI/Anthropic）
│   ├── demo-data.ts            # Demo 预置数据
│   ├── types.ts                # 类型定义 + 常量
│   ├── utils.ts                # 工具函数
│   ├── remotion/               # Remotion 视频合成
│   │   ├── index.ts
│   │   ├── Root.tsx
│   │   └── Composition.tsx
│   └── i18n/                   # 国际化
│       ├── dictionaries.ts     # 翻译词典
│       └── I18nProvider.tsx    # i18n Context Provider
└── screenshot.js               # Puppeteer 截图脚本
```
