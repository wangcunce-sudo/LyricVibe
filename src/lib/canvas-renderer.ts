/**
 * Canvas-based lyric subtitle renderer for LyricVibe.
 *
 * Extracted from VideoPreview.tsx to keep component size manageable
 * and to allow independent testing of drawing logic.
 */
import type { LyricLine, WordTimestamp, StyleParams, SubtitleTemplate } from "./types";

// ── Drawing helpers ──

/** Wrap text into multiple lines to fit within maxWidth pixels */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [text];
}

/** Draw text along a curved path for curvature effects */
export function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  curvature: number,
  fontSize: number,
  align: CanvasTextAlign,
) {
  if (Math.abs(curvature) < 0.001 || text.length <= 1) {
    ctx.fillText(text, x, y);
    if (ctx.lineWidth > 0) ctx.strokeText(text, x, y);
    return;
  }

  const chars = text.split("");
  const metrics = ctx.measureText(text);
  const totalWidth = metrics.width;

  let startX: number;
  switch (align) {
    case "left": startX = x; break;
    case "right": startX = x - totalWidth; break;
    default: startX = x - totalWidth / 2;
  }

  const maxArcOffset = curvature * fontSize * 4;

  for (let i = 0; i < chars.length; i++) {
    const charX = startX + ctx.measureText(chars.slice(0, i).join("")).width;
    const charProgress = chars.length > 1 ? i / (chars.length - 1) : 0.5;
    const arcOffset = maxArcOffset * (1 - Math.pow(2 * charProgress - 1, 2));
    const charY = y - arcOffset;

    ctx.fillText(chars[i], charX, charY);
    if (ctx.lineWidth > 0) ctx.strokeText(chars[i], charX, charY);
  }
}

// ── Sub-component: Background box ──

function drawBackground(
  ctx: CanvasRenderingContext2D,
  text: string,
  xPx: number,
  yPx: number,
  textAlign: CanvasTextAlign,
  maxTextWidth: number,
  fontSize: number,
  renderParams: SubtitleTemplate["render"],
) {
  const textMetrics = ctx.measureText(text);
  const textW = Math.min(textMetrics.width, maxTextWidth);
  const textH = fontSize * 1.2;
  const px = renderParams.paddingX;
  const py = renderParams.paddingY;
  const rx = renderParams.borderRadius;

  let bgX: number;
  switch (textAlign) {
    case "left": bgX = xPx - px; break;
    case "right": bgX = xPx - textW - px; break;
    default: bgX = xPx - textW / 2 - px;
  }
  const bgY = yPx - textH / 2 - py;
  const bgW = textW + px * 2;
  const bgH = textH + py * 2;

  ctx.save();

  if (renderParams.backgroundType === "glass") {
    ctx.globalAlpha = 0.3;
  }

  ctx.beginPath();
  ctx.moveTo(bgX + rx, bgY);
  ctx.lineTo(bgX + bgW - rx, bgY);
  ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + rx);
  ctx.lineTo(bgX + bgW, bgY + bgH - rx);
  ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - rx, bgY + bgH);
  ctx.lineTo(bgX + rx, bgY + bgH);
  ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - rx);
  ctx.lineTo(bgX, bgY + rx);
  ctx.quadraticCurveTo(bgX, bgY, bgX + rx, bgY);
  ctx.closePath();

  if (renderParams.backgroundType === "gradient") {
    const grad = ctx.createLinearGradient(bgX, bgY, bgX + bgW, bgY + bgH);
    grad.addColorStop(0, renderParams.primaryColor + "22");
    grad.addColorStop(1, renderParams.secondaryColor + "33");
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = renderParams.backgroundColor;
  }
  ctx.fill();
  ctx.restore();
}

// ── Sub-component: Decoration rendering ──

function drawDecorations(
  ctx: CanvasRenderingContext2D,
  params: StyleParams,
  renderParams: SubtitleTemplate["render"],
  layout: SubtitleTemplate["layout"],
  xPx: number,
  textAlign: CanvasTextAlign,
  maxTextWidth: number,
  fontSize: number,
  wrappedLines: string[],
  startY: number,
  lineIndex: number,
  yPx: number,
  alpha: number,
) {
  const decorations = params.decoration || [];
  if (decorations.includes("none") || decorations.length === 0 || alpha <= 0.1) return;

  const fullText = wrappedLines.join(" ");
  ctx.font = `${renderParams.fontWeight} ${fontSize}px ${renderParams.fontFamily}`;
  const textMetrics = ctx.measureText(fullText);
  const textW = Math.min(textMetrics.width, maxTextWidth);
  const lineH = fontSize * (layout.lineSpacing || 1.4);

  let blockLeft: number;
  switch (textAlign) {
    case "left": blockLeft = xPx; break;
    case "right": blockLeft = xPx - textW; break;
    default: blockLeft = xPx - textW / 2;
  }
  const blockTop = startY - lineH / 2;
  const blockWidth = textW;
  const blockHeight = wrappedLines.length * lineH;

  ctx.globalAlpha = alpha;
  ctx.lineWidth = 2;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  for (const deco of decorations) {
    switch (deco) {
      case "underline": {
        ctx.strokeStyle = renderParams.accentColor;
        ctx.beginPath();
        const ulY = blockTop + blockHeight + 4;
        ctx.moveTo(blockLeft, ulY);
        ctx.lineTo(blockLeft + blockWidth, ulY);
        ctx.stroke();
        break;
      }
      case "highlight": {
        ctx.fillStyle = renderParams.accentColor + "33";
        ctx.fillRect(blockLeft - 4, blockTop - 2, blockWidth + 8, blockHeight + 4);
        break;
      }
      case "border": {
        ctx.strokeStyle = renderParams.accentColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(blockLeft - 8, blockTop - 6, blockWidth + 16, blockHeight + 12);
        ctx.setLineDash([]);
        break;
      }
      case "emoji": {
        ctx.font = `${fontSize * 0.5}px sans-serif`;
        ctx.fillStyle = renderParams.accentColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const emojis = ["✨", "💫", "⭐"];
        ctx.fillText(emojis[lineIndex % emojis.length], blockLeft - fontSize * 0.6, yPx);
        ctx.fillText(emojis[(lineIndex + 1) % emojis.length], blockLeft + blockWidth + fontSize * 0.1, yPx);
        break;
      }
    }
  }
}

// ── Sub-component: Calculate layout ──

interface LayoutResult {
  posX: number;
  xPx: number;
  yPx: number;
  textAlign: CanvasTextAlign;
}

function calculateLayout(
  line: LyricLine,
  template: SubtitleTemplate,
  w: number,
  h: number,
  totalLines: number,
): LayoutResult {
  const { layout } = template;
  const isEven = line.index % 2 === 0;
  let posX = layout.positionX;

  switch (layout.alternateMode) {
    case "alternate":
      posX = isEven
        ? layout.positionX - layout.alternateAmplitude
        : layout.positionX + layout.alternateAmplitude;
      break;
    case "wave": {
      const wavePhase = (line.index / Math.max(totalLines - 1, 1)) * Math.PI * 2;
      posX = layout.positionX + Math.sin(wavePhase) * layout.alternateAmplitude;
      break;
    }
    case "random": {
      const pseudoRandom = ((line.index * 137 + 53) % 100) / 100;
      posX = layout.positionX + (pseudoRandom - 0.5) * 2 * layout.alternateAmplitude;
      break;
    }
  }

  // Clamp position to prevent text from going off-screen
  posX = Math.max(0.05, Math.min(0.95, posX));
  const xPx = posX * w;
  const yPx = layout.positionY * h;

  const textAlign: CanvasTextAlign =
    posX < 0.25 ? "left" : posX > 0.75 ? "right" : "center";

  return { posX, xPx, yPx, textAlign };
}

// ── Sub-component: Draw text with animation ──

function drawTextWithAnimation(
  ctx: CanvasRenderingContext2D,
  wrappedLines: string[],
  template: SubtitleTemplate,
  params: StyleParams,
  layoutResult: LayoutResult,
  clampedProgress: number,
  entranceProgress: number,
  exitProgress: number,
  alpha: number,
  fontSize: number,
  lineHeight: number,
  startY: number,
  maxTextWidth: number,
  frame?: number,
  wordTimestamps?: WordTimestamp[],
  lineIndex?: number,
) {
  const { animation, render: renderParams, layout } = template;
  const { xPx, textAlign } = layoutResult;
  const curvature = layout.curvature;
  // Match Remotion: even lines use primaryColor, odd lines use secondaryColor
  const textColor = (lineIndex ?? 0) % 2 === 0 ? renderParams.primaryColor : renderParams.secondaryColor;
  const accentColor = renderParams.accentColor;
  const highlightWords = renderParams.highlightWords || [];
  const glowColor = renderParams.glowColor || textColor;
  const glowAlpha = renderParams.glowIntensity;
  const strokeW = renderParams.strokeWidth || 0;
  const strokeColor = renderParams.strokeColor || "#000000";
  const f = frame ?? 0;

  switch (animation.entrance) {
    case "kinetic-pop": {
      // Per-word pop animation: each word pops in sequentially
      // Uses WhisperX word-level timestamps when available
      const words = wrappedLines[0].split(" ");
      const wordCount = words.length;

      // Measure each word width for positioning
      const wordWidths: number[] = [];
      let totalWordsWidth = 0;
      for (const word of words) {
        const w = ctx.measureText(word).width;
        wordWidths.push(w);
        totalWordsWidth += w;
      }
      const spaceWidth = ctx.measureText(" ").width;
      totalWordsWidth += spaceWidth * Math.max(0, wordCount - 1);

      // Starting X position based on text alignment
      let startX: number;
      switch (textAlign) {
        case "left": startX = xPx; break;
        case "right": startX = xPx - totalWordsWidth; break;
        default: startX = xPx - totalWordsWidth / 2;
      }

      let cursorX = startX;
      for (let wi = 0; wi < wordCount; wi++) {
        // Compute this word's individual pop animation timing
        let wordStart = 0;
        let wordEnd = 0;
        let hasExactTiming = false;

        if (wordTimestamps && wi < wordTimestamps.length) {
          const wt = wordTimestamps[wi];
          const lineStart = wordTimestamps[0]?.start ?? 0;
          const lineEnd = wordTimestamps[wordTimestamps.length - 1]?.end ?? 0;
          const lineDuration = Math.max(0.001, lineEnd - lineStart);
          wordStart = (wt.start - lineStart) / lineDuration;
          wordEnd = (wt.end - lineStart) / lineDuration;
          hasExactTiming = true;
        } else {
          const wordWindow = wordCount > 0 ? 0.8 / wordCount : 0.8;
          const wordStagger = wordCount > 0 ? 0.6 / wordCount : 0;
          wordStart = Math.min(1, wordStagger * wi);
          wordEnd = Math.min(1, wordStart + wordWindow);
        }
        
        let wordOpacity = 0;
        let wordScale = 0.8;
        let wordBounceY = 0;

        if (clampedProgress >= wordStart) {
          const popWindow = hasExactTiming
            ? Math.min(wordEnd - wordStart, 0.15)
            : Math.max(0.001, wordEnd - wordStart);
          const wordProgress = Math.min(1, (clampedProgress - wordStart) / Math.max(0.001, popWindow));
          const t = wordProgress;
          const popScale = t < 0.35
            ? 0.8 + t * 0.8
            : 1.08 - (t - 0.35) * 0.123;
          wordScale = Math.min(1.08, Math.max(0.8, popScale));
          wordBounceY = Math.sin(t * Math.PI * 3) * 3 * (1 - t);
          wordOpacity = Math.min(1, t * 4);
        }

        if (wordOpacity > 0.001) {
          // Keyword highlighting — matches Remotion behavior
          const cleanWord = words[wi].replace(/[^a-zA-Z0-9']/g, "").toLowerCase();
          const isHighlighted = highlightWords.some(
            (hw) => hw.toLowerCase() === cleanWord
          );
          const wordColor = isHighlighted ? accentColor : textColor;
          const wordFontWeight = isHighlighted
            ? Math.min(900, renderParams.fontWeight + 100)
            : renderParams.fontWeight;
          const flashAlpha = isHighlighted
            ? 0.7 + 0.3 * Math.sin(f * 0.3)
            : 1;
          const wordFontSize = isHighlighted
            ? fontSize * 1.08
            : fontSize;

          ctx.save();
          const wordCenterX = cursorX + wordWidths[wi] / 2;
          const wordY = startY + wordBounceY;
          ctx.globalAlpha = wordOpacity * alpha * flashAlpha;
          ctx.translate(wordCenterX, wordY);
          ctx.scale(wordScale, wordScale);
          ctx.font = `${wordFontWeight} ${wordFontSize}px ${renderParams.fontFamily}`;

          // Draw glow shadow behind word
          if (glowAlpha > 0.01) {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = fontSize * 0.6 * glowAlpha;
            ctx.fillStyle = wordColor;
            ctx.fillText(words[wi], 0, 0);
            ctx.restore();
          }

          // Draw word stroke for background separation (matches Remotion WebkitTextStroke)
          if (strokeW > 0) {
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeW;
            ctx.lineJoin = "round";
            ctx.miterLimit = 2;
            ctx.strokeText(words[wi], 0, 0);
            ctx.restore();
          }

          // Draw word fill
          ctx.fillStyle = wordColor;
          ctx.fillText(words[wi], 0, 0);
          ctx.restore();
        }

        cursorX += wordWidths[wi] + (wi < wordCount - 1 ? spaceWidth : 0);
      }
      break;
    }
    case "bounce": {
      const t = entranceProgress;
      const bounceY = Math.sin(t * Math.PI * 2) * 6 * (1 - t) * (1 - exitProgress);
      const scale = 1 + Math.sin(t * Math.PI) * 0.08 * animation.bounciness;
      const driftX = layoutResult.posX < 0.3
        ? Math.sin(t * Math.PI) * 8
        : layoutResult.posX > 0.7 ? -Math.sin(t * Math.PI) * 8 : 0;

      ctx.save();
      ctx.translate(xPx + driftX, startY + bounceY);
      ctx.scale(scale, scale);

      for (let i = 0; i < wrappedLines.length; i++) {
        const ly = i * lineHeight;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = fontSize * 0.6 * glowAlpha;
        ctx.fillStyle = textColor;
        drawCurvedText(ctx, wrappedLines[i], 0, ly, curvature, fontSize, textAlign);
        ctx.restore();

        ctx.fillStyle = textColor;
        drawCurvedText(ctx, wrappedLines[i], 0, ly, curvature, fontSize, textAlign);
      }

      ctx.restore();
      break;
    }
    case "fade-in":
    case "slide-up": {
      const offsetY = animation.entrance === "slide-up"
        ? (1 - entranceProgress) * 30 + exitProgress * 10
        : (1 - entranceProgress) * 10 + exitProgress * 10;

      for (let i = 0; i < wrappedLines.length; i++) {
        const ly = startY + i * lineHeight + offsetY;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = fontSize * 0.6 * glowAlpha;
        ctx.fillStyle = textColor;
        drawCurvedText(ctx, wrappedLines[i], xPx, ly, curvature, fontSize, textAlign);
        ctx.restore();

        ctx.fillStyle = textColor;
        drawCurvedText(ctx, wrappedLines[i], xPx, ly, curvature, fontSize, textAlign);
      }
      break;
    }
    case "scale-up": {
      const sc = 0.8 + entranceProgress * 0.3;
      ctx.save();
      ctx.translate(xPx, startY);
      ctx.scale(sc, sc);

      for (let i = 0; i < wrappedLines.length; i++) {
        const ly = i * lineHeight;
        ctx.fillStyle = textColor;
        drawCurvedText(ctx, wrappedLines[i], 0, ly, curvature, fontSize, textAlign);
      }
      ctx.restore();
      break;
    }
    case "karaoke": {
      for (let i = 0; i < wrappedLines.length; i++) {
        const ly = startY + i * lineHeight;
        ctx.globalAlpha = 0.3 * alpha;
        ctx.fillStyle = renderParams.secondaryColor;
        drawCurvedText(ctx, wrappedLines[i], xPx, ly, curvature, fontSize, textAlign);

        ctx.save();
        const metrics = ctx.measureText(wrappedLines[i]);
        const clipW = metrics.width * clampedProgress;
        ctx.beginPath();
        ctx.rect(xPx - metrics.width / 2, ly - fontSize, clipW, fontSize * 2);
        ctx.clip();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = renderParams.accentColor;
        drawCurvedText(ctx, wrappedLines[i], xPx, ly, curvature, fontSize, textAlign);
        ctx.restore();
      }
      break;
    }
    case "typewriter": {
      for (let i = 0; i < wrappedLines.length; i++) {
        const ly = startY + i * lineHeight;
        const visibleChars = Math.floor(wrappedLines[i].length * clampedProgress);
        const visibleText = wrappedLines[i].slice(0, visibleChars);
        ctx.fillStyle = textColor;
        drawCurvedText(ctx, visibleText, xPx, ly, curvature, fontSize, textAlign);
      }
      break;
    }
    case "none":
      ctx.globalAlpha = 1;
      for (let i = 0; i < wrappedLines.length; i++) {
        const ly = startY + i * lineHeight;
        ctx.fillStyle = textColor;
        drawCurvedText(ctx, wrappedLines[i], xPx, ly, curvature, fontSize, textAlign);
      }
      break;
    default: {
      ctx.globalAlpha = alpha;
      for (let i = 0; i < wrappedLines.length; i++) {
        const ly = startY + i * lineHeight;
        ctx.fillStyle = textColor;
        drawCurvedText(ctx, wrappedLines[i], xPx, ly, curvature, fontSize, textAlign);
      }
    }
  }
}

// ── Main entry point ──

const MAX_WIDTH_RATIO_FALLBACK = 0.85;

export function drawLyricLineWithTemplate(
  ctx: CanvasRenderingContext2D,
  line: LyricLine,
  progress: number,
  params: StyleParams,
  template: SubtitleTemplate,
  w: number,
  h: number,
  totalLines: number,
  frame?: number,
) {
  const { layout, animation, render: renderParams } = template;

  ctx.save();

  // ── Layout calculation ──
  const layoutResult = calculateLayout(line, template, w, h, totalLines);
  const { xPx, yPx, textAlign } = layoutResult;

  ctx.textAlign = textAlign;
  ctx.textBaseline = "middle";

  const curvature = layout.curvature;
  const fontSize = renderParams.fontSize;

  // ── All Caps processing ──
  const displayText = renderParams.allCaps ? line.text.toUpperCase() : line.text;

  // ── Clipping region to prevent subtitle overflow ──
  const marginX = w * 0.03;
  const marginY = h * 0.03;
  ctx.beginPath();
  ctx.rect(marginX, marginY, w - marginX * 2, h - marginY * 2);
  ctx.clip();

  // Calculate available text width based on maxWidthRatio
  const maxWidthRatio = layout.maxWidthRatio || MAX_WIDTH_RATIO_FALLBACK;
  const maxTextWidth = w * maxWidthRatio;

  // ── Animation progress ──
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const entranceDur = animation.entranceDuration;
  const lineDuration = entranceDur + animation.exitDuration + 0.5;
  const entranceProgress = Math.min(1, clampedProgress / (entranceDur / lineDuration));
  const exitProgress = Math.max(0, (clampedProgress - (1 - animation.exitDuration / lineDuration)) / (animation.exitDuration / lineDuration));
  const alpha = Math.min(1, entranceProgress * 2) * (1 - exitProgress);

  const textColor = line.index % 2 === 0 ? renderParams.primaryColor : renderParams.secondaryColor;

  ctx.font = `${renderParams.fontWeight} ${fontSize}px ${renderParams.fontFamily}`;

  // ── Background box (clipped) ──
  if (renderParams.backgroundType !== "none") {
    drawBackground(ctx, displayText, xPx, yPx, textAlign, maxTextWidth, fontSize, renderParams);
  }

  // ── Heavy black stroke for background separation ──
  const strokeW = renderParams.strokeWidth || 4;
  if (strokeW > 0) {
    ctx.strokeStyle = renderParams.strokeColor || "#000000";
    ctx.lineWidth = strokeW;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
  }

  // ── Text shadow ──
  if (renderParams.textShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = fontSize * 0.35;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  ctx.globalAlpha = alpha;

  // ── Wrap text to fit within maxTextWidth ──
  const wrappedLines = wrapText(ctx, displayText, maxTextWidth);
  const lineHeight = fontSize * (layout.lineSpacing || 1.4);
  const totalHeight = wrappedLines.length * lineHeight;
  const startY = yPx - totalHeight / 2 + lineHeight / 2;

  // ── Draw text with selected animation ──
  drawTextWithAnimation(
    ctx,
    wrappedLines,
    template,
    params,
    layoutResult,
    clampedProgress,
    entranceProgress,
    exitProgress,
    alpha,
    fontSize,
    lineHeight,
    startY,
    maxTextWidth,
    frame,
    line.words,
    line.index,
  );

  // ── Stroke drawing (drawn on top of fill for outline effect) ──
  // Skip for kinetic-pop: stroke is already drawn per-word inside the animation
  if (strokeW > 0 && animation.entrance !== "kinetic-pop") {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = renderParams.strokeColor || "#000000";
    ctx.lineWidth = strokeW;
    ctx.lineJoin = "round";
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    for (let i = 0; i < wrappedLines.length; i++) {
      const ly = startY + i * lineHeight;
      ctx.strokeText(wrappedLines[i], xPx, ly);
    }
  }

  ctx.restore();
}
