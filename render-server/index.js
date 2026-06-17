/**
 * LyricVibe Render Server
 * 
 * 基于 Express.js + Remotion SSR API 的视频渲染服务
 * 
 * API:
 *   POST /renders          - 启动渲染任务
 *   GET  /renders/:id      - 查询渲染进度
 *   GET  /renders/:id/output.mp4 - 下载渲染结果
 *   DELETE /renders/:id    - 取消渲染任务
 *   GET  /health           - 健康检查
 * 
 * 使用方式：
 *   node render-server/index.js
 *   # 或 Docker: docker build && docker run
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition, getCompositions } = require("@remotion/renderer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

// 渲染任务存储（生产环境建议用 Redis/数据库）
const renders = new Map();

// 输出目录
const OUTPUT_DIR = path.join(__dirname, "..", "out", "renders");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Remotion 项目入口
const ENTRY_POINT = path.resolve(__dirname, "..", "src", "lib", "remotion", "index.ts");

// ============ 健康检查 ============
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ 启动渲染任务 ============
app.post("/renders", async (req, res) => {
  try {
    const { inputProps, composition: compositionId, codec = "h264" } = req.body;

    if (!inputProps) {
      return res.status(400).json({ error: "缺少 inputProps 参数" });
    }

    const renderId = uuidv4();
    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);

    // 初始化任务状态
    renders.set(renderId, {
      id: renderId,
      status: "pending",
      progress: 0,
      outputPath,
      inputProps,
      compositionId: compositionId || "LyricVibeVideo",
      codec,
      createdAt: new Date().toISOString(),
    });

    // 异步启动渲染（不阻塞响应）
    startRender(renderId).catch((err) => {
      console.error(`[${renderId}] 渲染失败:`, err);
      const task = renders.get(renderId);
      if (task) {
        task.status = "failed";
        task.error = err.message;
      }
    });

    res.status(202).json({
      renderId,
      status: "pending",
      message: "渲染任务已提交",
    });
  } catch (error) {
    console.error("提交渲染任务失败:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ 查询渲染进度 ============
app.get("/renders/:id", (req, res) => {
  const { id } = req.params;
  const task = renders.get(id);

  if (!task) {
    return res.status(404).json({ error: "渲染任务不存在" });
  }

  res.json({
    id: task.id,
    status: task.status,
    progress: task.progress,
    compositionId: task.compositionId,
    codec: task.codec,
    createdAt: task.createdAt,
    completedAt: task.completedAt || null,
    error: task.error || null,
    // 渲染完成时返回下载 URL
    downloadUrl:
      task.status === "done"
        ? `/renders/${id}/output.mp4`
        : null,
  });
});

// ============ 下载渲染结果 ============
app.get("/renders/:id/output.mp4", (req, res) => {
  const { id } = req.params;
  const task = renders.get(id);

  if (!task || task.status !== "done") {
    return res.status(404).json({ error: "渲染结果不存在或未完成" });
  }

  if (!fs.existsSync(task.outputPath)) {
    return res.status(404).json({ error: "输出文件不存在" });
  }

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="lyricvibe-${id}.mp4"`
  );
  fs.createReadStream(task.outputPath).pipe(res);
});

// ============ 取消渲染 ============
app.delete("/renders/:id", (req, res) => {
  const { id } = req.params;
  const task = renders.get(id);

  if (!task) {
    return res.status(404).json({ error: "渲染任务不存在" });
  }

  if (task.status === "done" || task.status === "failed") {
    return res.status(400).json({ error: "任务已结束，无法取消" });
  }

  task.status = "cancelled";
  res.json({ id, status: "cancelled" });
});

// ============ 列出所有 Composition ============
app.get("/compositions", async (req, res) => {
  try {
    // 检查入口文件是否存在
    if (!fs.existsSync(ENTRY_POINT)) {
      return res.json({
        note: "Remotion 入口文件不存在，请确保 src/lib/remotion/index.ts 存在",
        compositions: [
          {
            id: "LyricVibeVideo",
            fps: 30,
            width: 1920,
            height: 1080,
            durationInFrames: 1020,
          },
        ],
      });
    }

    const bundled = await bundle({ entryPoint: ENTRY_POINT });
    const comps = await getCompositions(bundled);
    res.json({ compositions: comps });
  } catch (error) {
    console.error("获取 compositions 失败:", error);
    // 返回 fallback 信息
    res.json({
      error: error.message,
      compositions: [
        {
          id: "LyricVibeVideo",
          fps: 30,
          width: 1920,
          height: 1080,
          durationInFrames: 1020,
        },
      ],
    });
  }
});

// ============ 核心渲染逻辑 ============
async function startRender(renderId) {
  const task = renders.get(renderId);
  if (!task) return;

  task.status = "bundling";
  console.log(`[${renderId}] 开始打包 Remotion 项目...`);

  // Step 1: Bundle Remotion 项目
  const bundled = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: (progress) => {
      console.log(`[${renderId}] 打包进度: ${progress}%`);
      task.progress = Math.floor(progress * 0.1); // 打包占 10%
    },
  });

  console.log(`[${renderId}] 打包完成: ${bundled}`);

  // Step 2: 选择 Composition
  task.status = "rendering";
  console.log(`[${renderId}] 开始渲染...`);

  const inputProps = {
    videoUrl: task.inputProps.videoUrl || "",
    lyrics: task.inputProps.lyrics || [
      { start: 0, end: 3, text: "🎵 Hello from LyricVibe", id: "1" },
      { start: 3, end: 6, text: "Remotion Render Server", id: "2" },
      { start: 6, end: 9, text: "Powered by Docker", id: "3" },
    ],
    styleParams: task.inputProps.styleParams || {
      fontFamily: "sans-serif",
      fontSize: 64,
      color: "#ffffff",
      animation: "karaoke",
    },
    filter: task.inputProps.filter || "none",
  };

  const compositionId = task.compositionId;

  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps,
  });

  if (!composition) {
    throw new Error(`找不到 Composition: ${compositionId}`);
  }

  // Step 3: 渲染视频
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: task.codec,
    outputLocation: task.outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      task.progress = 10 + Math.floor(progress * 90); // 渲染占 90%
      // 每 10% 打印一次日志
      if (progress % 10 === 0) {
        console.log(`[${renderId}] 渲染进度: ${task.progress}%`);
      }
    },
    // Chromium 配置
    chromiumOptions: {
      // 如果环境变量设置了 Chromium 路径则使用
      ...(process.env.PUPPETEER_EXECUTABLE_PATH
        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
        : {}),
    },
  });

  task.status = "done";
  task.progress = 100;
  task.completedAt = new Date().toISOString();
  console.log(`[${renderId}] 渲染完成! 输出: ${task.outputPath}`);
}

// ============ 启动服务器 ============
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       🎬 LyricVibe Render Server            ║
║                                              ║
║   服务地址: http://localhost:${PORT}              ║
║   健康检查: http://localhost:${PORT}/health       ║
║   API 文档: http://localhost:${PORT}/            ║
║                                              ║
║   POST /renders        启动渲染              ║
║   GET  /renders/:id    查询进度              ║
║   GET  /renders/:id/output.mp4  下载结果     ║
║   DELETE /renders/:id  取消渲染              ║
║   GET  /compositions   列出可用的视频模板    ║
╚══════════════════════════════════════════════╝
  `);
});
