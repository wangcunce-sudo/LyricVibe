/**
 * POST /api/render
 *
 * 使用 Remotion SSR API 在服务端渲染视频。
 *
 * 音频处理策略：
 * - 在 bundle 之后，将媒体文件复制到 bundle 的 public/ 目录
 * - 传给 Composition 的 props 使用纯文件名（如 "demo_audio.mp3"）
 * - Composition 内部使用 staticFile() 引用这些文件
 *
 * 环境变量：
 *   RENDER_SERVER_URL  - 如果设置，转发到独立渲染服务器
 *   CHROMIUM_PATH       - Chromium 可执行文件路径（本地模式）
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { RenderRequestSchema } from "@/lib/validation";

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 将前端 URL 解析为本地文件路径和纯文件名。
 * 返回 { filePath, assetName }
 */
function resolveAsset(
  url: string | undefined
): { filePath: string | null; assetName: string } | null {
  if (!url) return null;

  // Blob URL — 无法访问
  if (url.startsWith("blob:")) return null;

  // /demo_xxx.mp3 或 /uploads/xxx.mp3
  if (url.startsWith("/")) {
    return {
      filePath: path.join(process.cwd(), "public", url),
      assetName: path.basename(url),
    };
  }

  // http://... 尝试提取路径部分
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/demo_") || parsed.pathname.startsWith("/uploads/")) {
        return {
          filePath: path.join(process.cwd(), "public", parsed.pathname),
          assetName: path.basename(parsed.pathname),
        };
      }
    } catch {}
  }

  return null;
}

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL;
const OUTPUT_DIR = path.join(process.cwd(), "out", "renders");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = RenderRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      videoUrl,
      audioUrl,
      extractAudioFromVideo,
      lyrics,
      styleParams,
      filter,
      speed,
      pitch,
    } = parsed.data;

    const videoAsset = resolveAsset(videoUrl);
    // 音频来源：独立音频文件 > 视频文件（从视频中提取音轨）
    const audioAsset = resolveAsset(audioUrl);

    // 热舞片段 (hot_dance)：视频和音频天然从 0s 开始，歌词时间轴也从 0 开始，无需裁剪。
    // 直接使用原始媒体文件。
    let processedAudioPath: string | null = audioAsset?.filePath || null;
    let processedAudioName: string | null = audioAsset?.assetName || null;

    // 当 extractAudioFromVideo 为 true 且视频文件可访问时，用 ffmpeg 从视频中提取音轨
    if (extractAudioFromVideo && videoAsset?.filePath && fs.existsSync(videoAsset.filePath) && !audioAsset) {
      const extractDir = path.join(process.cwd(), "out", "extracted");
      if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });
      const extractPath = path.join(extractDir, `extracted_audio_${Date.now()}.mp3`);
      try {
        const { execSync } = await import("child_process");
        execSync(`ffmpeg -y -i "${videoAsset.filePath}" -vn -codec:a libmp3lame -qscale:a 2 "${extractPath}" 2>/dev/null`);
        if (fs.existsSync(extractPath)) {
          processedAudioPath = extractPath;
          processedAudioName = path.basename(extractPath);
          logger.info("render", `从视频中提取音轨成功: ${processedAudioName}`);
        }
      } catch (e) {
        logger.warn("render", "从视频中提取音轨失败，将使用视频文件作为音频源:", e);
        // 回退：直接用视频文件作为音频源（ffmpeg 可以从视频中读取音轨）
        processedAudioPath = videoAsset.filePath;
        processedAudioName = videoAsset.assetName;
      }
    }

    // 如果用户上传的是 demo_audio.mp3（已转换为 0s 对齐的音频），直接使用
    if (audioAsset?.filePath && fs.existsSync(audioAsset.filePath) && lyrics?.length > 0) {
      const firstStartTime = Math.min(...lyrics.map((l: { startTime: number }) => l.startTime));
      // 热舞音频不需要裁剪：歌词从 0s 开始，音频也从 0s 开始
      if (firstStartTime < 0.5) {
        logger.info("render", `歌词从 ${firstStartTime}s 开始，音频无需裁剪`);
        // 如果音频是 m4a 格式，转换为 mp3 以确保兼容性
        if (audioAsset.filePath.endsWith('.m4a')) {
          const convertedDir = path.join(process.cwd(), "out", "trimmed");
          if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir, { recursive: true });
          const convertedPath = path.join(convertedDir, `converted_${Date.now()}.mp3`);
          const { execSync } = await import("child_process");
          try {
            execSync(`ffmpeg -y -i "${audioAsset.filePath}" -codec:a libmp3lame -qscale:a 2 "${convertedPath}" 2>/dev/null`);
            if (fs.existsSync(convertedPath)) {
              processedAudioPath = convertedPath;
              processedAudioName = path.basename(convertedPath);
              logger.info("render", `m4a→mp3 转换成功: ${processedAudioName}`);
            }
          } catch (e) {
            logger.warn("render", "m4a 转换失败，使用原始文件:", e);
          }
        }
      }
    }

    logger.info("render", `videoUrl: ${videoUrl} → ${videoAsset?.filePath || "无"}`);
    logger.info("render", `audioUrl: ${audioUrl} → ${audioAsset?.filePath || "无"} (processed: ${processedAudioPath})`);
    if (extractAudioFromVideo) {
      logger.info("render", `extractAudioFromVideo=true, 从视频提取音轨`);
    }

    // ============================================================
    // 模式 1: Docker Render Server
    // ============================================================
    if (RENDER_SERVER_URL) {
      logger.info("render", `转发到渲染服务器: ${RENDER_SERVER_URL}`);

      // Merge styleParams into subtitleTemplate for consistency with frontend
      const mergedTemplate = body.subtitleTemplate
        ? {
            ...body.subtitleTemplate,
            render: {
              ...body.subtitleTemplate.render,
              fontFamily: (styleParams?.fontFamily) || body.subtitleTemplate.render.fontFamily,
              fontSize: (styleParams?.fontSize) || body.subtitleTemplate.render.fontSize,
              fontWeight: (styleParams?.fontWeight) || body.subtitleTemplate.render.fontWeight,
              primaryColor: (styleParams?.primaryColor) || body.subtitleTemplate.render.primaryColor,
              secondaryColor: (styleParams?.secondaryColor) || body.subtitleTemplate.render.secondaryColor,
              accentColor: (styleParams?.accentColor) || body.subtitleTemplate.render.accentColor,
              textShadow: (styleParams?.textShadow) ?? body.subtitleTemplate.render.textShadow,
            },
            animation: {
              ...body.subtitleTemplate.animation,
              entrance: (styleParams?.animation) || body.subtitleTemplate.animation.entrance,
            },
          }
        : undefined;

      const renderRes = await fetch(`${RENDER_SERVER_URL}/renders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputProps: {
            videoUrl: videoAsset?.filePath || videoUrl || "",
            audioUrl: audioAsset?.filePath || audioUrl || "",
            lyrics,
            styleParams: styleParams || {
              fontFamily: "sans-serif",
              fontSize: 64,
              primaryColor: "#ffffff",
              secondaryColor: "#cccccc",
              accentColor: "#ff6b6b",
              animation: "karaoke",
              decoration: ["none"],
              fontWeight: 600,
              textShadow: true,
            },
            filter: filter || "none",
            speed: speed || 1,
            pitch: pitch || 0,
            subtitleTemplate: mergedTemplate || undefined,
          },
          composition: "LyricVibeVideo",
          codec: "h264",
        }),
      });

      if (!renderRes.ok) {
        const errData = await renderRes.json().catch(() => ({}));
        throw new Error(
          `渲染服务器返回错误: ${renderRes.status} ${JSON.stringify(errData)}`
        );
      }

      const { renderId } = await renderRes.json();
      const downloadUrl = await pollRenderProgress(renderId);

      return NextResponse.json({
        success: true,
        renderId,
        downloadUrl,
        message: "视频渲染完成",
      });
    }

    // ============================================================
    // 模式 2: 本地 SSR 渲染
    // ============================================================
    logger.info("render", "使用本地 Remotion SSR 渲染...");

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const renderId = generateId();
    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);

    // 动态导入 Remotion 模块
    // @ts-ignore
    const { bundle } = await import("@remotion/bundler");
    // @ts-ignore
    const { renderMedia, selectComposition } = await import(
      "@remotion/renderer"
    );

    const entryPoint = path.resolve(
      process.cwd(),
      "src",
      "lib",
      "remotion",
      "index.ts"
    );

    // Step 1: Bundle
    logger.info(`render:${renderId}`, "打包 Remotion 项目...");
    const bundled = await bundle({
      entryPoint,
      onProgress: (progress: number) => {
        if (progress % 25 === 0) {
          logger.info(`render:${renderId}`, `打包进度: ${progress}%`);
        }
      },
    });

    // Step 2: 复制媒体文件到 bundle 的 public 目录
    // Remotion 在 bundle 时会创建 public/ 目录，我们复制文件进去
    const bundlePublicDir = path.join(bundled, "public");
    if (!fs.existsSync(bundlePublicDir)) {
      fs.mkdirSync(bundlePublicDir, { recursive: true });
    }

    let resolvedVideoAsset: string | null = null;
    let resolvedAudioAsset: string | null = null;

    if (videoAsset?.filePath && fs.existsSync(videoAsset.filePath)) {
      const dest = path.join(bundlePublicDir, videoAsset.assetName);
      await fsPromises.copyFile(videoAsset.filePath, dest);
      resolvedVideoAsset = videoAsset.assetName;
      logger.info(`render:${renderId}`, `复制视频: ${videoAsset.assetName} → bundle/public/`);
    }

    // 使用处理后的音频（可能是 ffmpeg 裁剪过的）
    if (processedAudioPath && fs.existsSync(processedAudioPath)) {
      const audioName = processedAudioName || path.basename(processedAudioPath);
      const dest = path.join(bundlePublicDir, audioName);
      await fsPromises.copyFile(processedAudioPath, dest);
      resolvedAudioAsset = audioName;
      logger.info(`render:${renderId}`, `复制音频: ${audioName} → bundle/public/`);
    }

    // Step 3: 选择 Composition
    // 传入纯文件名，Composition 内部用 staticFile() 解析
    const inputProps = {
      videoUrl: resolvedVideoAsset || "",
      audioUrl: resolvedAudioAsset || "",
      lyrics,
      styleParams: styleParams || {
        fontFamily: "sans-serif",
        fontSize: 64,
        color: "#ffffff",
        animation: "karaoke",
      },
      filter: filter || "none",
      speed: speed || 1,
      pitch: pitch || 0,
      subtitleTemplate: body.subtitleTemplate || undefined,
    };

    logger.info(`render:${renderId}`, "========== INPUT PROPS DEBUG ==========");
    logger.info(`render:${renderId}`, "styleParams:", JSON.stringify(inputProps.styleParams, null, 2));
    logger.info(`render:${renderId}`, `filter: "${inputProps.filter}"`);
    logger.info(`render:${renderId}`, `speed: ${inputProps.speed}`);
    logger.info(`render:${renderId}`, `subtitleTemplate present: ${!!inputProps.subtitleTemplate}`);
    logger.info(`render:${renderId}`, `lyrics count: ${inputProps.lyrics?.length || 0}`);
    logger.info(`render:${renderId}`, `audioUrl: "${inputProps.audioUrl}"`);
    logger.info(`render:${renderId}`, `videoUrl: "${inputProps.videoUrl}"`);
    logger.info(`render:${renderId}`, "=========================================");

    const composition = await selectComposition({
      serveUrl: bundled,
      id: "LyricVibeVideo",
      inputProps,
    });

    if (!composition) {
      throw new Error("找不到 Composition: LyricVibeVideo");
    }

    // Debug: verify that selectComposition merged inputProps correctly
    logger.info(`render:${renderId}`, "composition.props after selectComposition:", JSON.stringify({
      styleParams: (composition as any).props?.styleParams,
      filter: (composition as any).props?.filter,
      speed: (composition as any).props?.speed,
      subtitleTemplatePresent: !!(composition as any).props?.subtitleTemplate,
    }, null, 2));

    // CRITICAL: Ensure composition.props has the correct merged inputProps.
    // Remotion's selectComposition does a shallow merge of inputProps into defaultProps,
    // but we need to ensure the final props are exactly what we want.
    // We explicitly set composition.props to our inputProps to avoid any merge issues.
    (composition as any).props = { ...(composition as any).props, ...inputProps };
    logger.info(`render:${renderId}`, "composition.props AFTER explicit merge:", JSON.stringify({
      styleParams: (composition as any).props?.styleParams,
      filter: (composition as any).props?.filter,
      speed: (composition as any).props?.speed,
      subtitleTemplatePresent: !!(composition as any).props?.subtitleTemplate,
    }, null, 2));

    // Adjust duration based on speed: faster speed = shorter video
    const renderSpeed = (inputProps.speed as number) || 1;
    const adjustedDurationInFrames = Math.ceil(composition.durationInFrames / renderSpeed);

    logger.info(
      `render:${renderId}`,
      `Composition: ${composition.width}x${composition.height}, ${composition.fps}fps, ${composition.durationInFrames} frames, speed: ${renderSpeed}x, adjusted: ${adjustedDurationInFrames} frames`
    );

    // Step 4: 渲染
    logger.info(`render:${renderId}`, `开始渲染视频（含音频，speed: ${renderSpeed}x）...`);
    const chromePath =
      process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      audioCodec: "aac",
      durationInFrames: adjustedDurationInFrames,
      onProgress: ({ progress }: { progress: number }) => {
        if (progress % 10 === 0) {
          logger.info(`render:${renderId}`, `渲染进度: ${progress}%`);
        }
      },
      ...(chromePath
        ? ({ chromiumOptions: { executablePath: chromePath } } as any)
        : {}),
    });

    logger.info(`render:${renderId}`, `渲染完成: ${outputPath}`);

    const downloadUrl = `/api/render/${renderId}/download`;

    return NextResponse.json(
      {
        success: true,
        renderId,
        downloadUrl,
        outputPath,
        message: "视频渲染完成",
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    logger.error("render", "渲染失败:", error);
    return NextResponse.json(
      {
        error: "渲染失败",
        details: (error instanceof Error ? error.message : null) || "未知错误",
        hint: process.env.RENDER_SERVER_URL
          ? "请检查渲染服务器是否正常运行"
          : "请确保已安装 @remotion/renderer 和 puppeteer",
      },
      { status: 500 }
    );
  }
}

async function pollRenderProgress(
  renderId: string,
  maxWaitMs = 600000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 3000;

  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(`${RENDER_SERVER_URL}/renders/${renderId}`);
    if (!res.ok) throw new Error(`查询渲染进度失败: ${res.status}`);

    const data = await res.json();

    if (data.status === "done") {
      return `${RENDER_SERVER_URL}/renders/${renderId}/output.mp4`;
    }

    if (data.status === "failed") {
      throw new Error(`渲染失败: ${data.error || "未知错误"}`);
    }

    if (data.status === "cancelled") {
      throw new Error("渲染任务已取消");
    }

    logger.info(
      `render:${renderId}`,
      `进度: ${data.progress}%, 状态: ${data.status}`
    );
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error("渲染超时（超过10分钟）");
}

export const maxDuration = 600;
