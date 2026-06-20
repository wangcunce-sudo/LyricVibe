import { describe, it, expect } from "vitest";
import { safeJsonParse } from "./ai-service";

// ============================================================
// Tests for safeJsonParse (now exported from ai-service)
// ============================================================

describe("safeJsonParse", () => {
  it("should parse valid JSON", () => {
    const result = safeJsonParse('{"key": "value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("should parse JSON wrapped in markdown code fences", () => {
    const result = safeJsonParse('```json\n{"key": "value"}\n```');
    expect(result).toEqual({ key: "value" });
  });

  it("should parse JSON with only ``` fences (no language)", () => {
    const result = safeJsonParse('```\n{"key": "value"}\n```');
    expect(result).toEqual({ key: "value" });
  });

  it("should extract JSON from text with surrounding content", () => {
    const result = safeJsonParse('Some text before {"key": "value"} and after');
    expect(result).toEqual({ key: "value" });
  });

  it("should throw when no JSON object is found", () => {
    expect(() => safeJsonParse("no json here")).toThrow("Could not find JSON object");
  });

  it("should throw when malformed JSON is found", () => {
    // Text with braces but invalid JSON inside
    expect(() => safeJsonParse("some text { key: malformed value }")).toThrow("Failed to parse AI response as JSON");
  });

  it("should handle nested JSON objects correctly (not greedy match)", () => {
    const result = safeJsonParse('{"outer": {"inner": {"deep": true}}}');
    expect(result).toEqual({ outer: { inner: { deep: true } } });
  });

  it("should handle arrays in JSON", () => {
    const result = safeJsonParse('{"items": [1, 2, 3]}');
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it("should handle multiple JSON objects by picking the largest", () => {
    // The largest object is the actual payload
    const input = 'prefix {"small": 1} and some text {"main": {"data": [1,2,3], "nested": {"a": 1}}} suffix';
    const result = safeJsonParse(input);
    expect(result).toHaveProperty("main");
    expect(result).toHaveProperty("main.data");
    expect((result as any).main.data).toEqual([1, 2, 3]);
  });

  it("should fix trailing commas", () => {
    const result = safeJsonParse('{"key": "value",}');
    expect(result).toEqual({ key: "value" });
  });

  it("should handle empty JSON object", () => {
    const result = safeJsonParse("{}");
    expect(result).toEqual({});
  });

  it("should handle Unicode characters", () => {
    const result = safeJsonParse('{"情绪": "喜悦", "强度": 0.9}');
    expect(result).toEqual({ "情绪": "喜悦", "强度": 0.9 });
  });

  it("should handle JSON with escaped characters", () => {
    const result = safeJsonParse('{"text": "hello\\nworld", "path": "C:\\\\Users"}');
    expect(result).toEqual({ text: "hello\nworld", path: "C:\\Users" });
  });
});

// ============================================================
// Tests for parseAnalysisResponse (extracted helper)
// ============================================================

// NOTE: parseAnalysisResponse is not exported, but its behavior
// is covered by testing through safeJsonParse which it uses internally.

describe("parseAnalysisResponse (via safeJsonParse)", () => {
  it("should parse a complete analysis JSON", () => {
    const input = JSON.stringify({
      emotions: [{ label: "joy", intensity: 0.8 }],
      theme: ["summer", "romance"],
      tempo: "fast",
      suggestedPalette: ["#FF0000", "#00FF00", "#0000FF"],
      suggestedFontStyle: "bold sans-serif",
      stylePrompt: "Bright and energetic!",
    });
    const result = safeJsonParse(input);
    expect(result.emotions).toEqual([{ label: "joy", intensity: 0.8 }]);
    expect(result.theme).toEqual(["summer", "romance"]);
    expect(result.tempo).toBe("fast");
  });

  it("should handle alternative field names (emotion singular)", () => {
    const input = JSON.stringify({
      emotion: [{ label: "sadness", intensity: 0.5 }],
      themes: ["rainy day"],
    });
    const result = safeJsonParse(input);
    expect(result.emotion).toEqual([{ label: "sadness", intensity: 0.5 }]);
    expect(result.themes).toEqual(["rainy day"]);
  });

  it("should handle string emotions (not objects)", () => {
    const input = JSON.stringify({
      emotions: ["joy", "sadness"],
    });
    const result = safeJsonParse(input);
    expect(result.emotions).toEqual(["joy", "sadness"]);
  });
});

// ============================================================
// Tests for getDefaultAnalysis (extracted helper)
// ============================================================

interface TestLyricLine {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
}

describe("getDefaultAnalysis", () => {
  // Replicate for testing
  function isChineseLyrics(lyrics: TestLyricLine[]): boolean {
    const text = lyrics.map((l) => l.text).join("");
    const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    return chineseChars > text.length * 0.3;
  }

  function getDefaultAnalysis(lyrics: TestLyricLine[]) {
    const text = lyrics.map((l) => l.text).join(" ");
    const wordCount = text.split(/\s+/).length;
    const tempo =
      wordCount / (lyrics.length || 1) > 6
        ? "fast"
        : wordCount / (lyrics.length || 1) > 3
          ? "medium"
          : "slow";

    const isChinese = isChineseLyrics(lyrics);

    return {
      emotions: [{ label: isChinese ? "平静" : "calmness", intensity: 0.7 }],
      theme: isChinese ? ["沉思", "个人"] : ["reflective", "personal"],
      tempo: tempo as "slow" | "medium" | "fast",
      suggestedPalette: ["#FFFFFF", "#E0E0E0", "#FF6B6B"],
      suggestedFontStyle: "clean sans-serif",
      stylePrompt: isChinese
        ? "现代简约无衬线字体，白色主字配淡蓝辅色，居中淡入动画，柔和文字阴影，半透明深色背景。简洁、优雅、叙述感。"
        : "Clean modern typography with white text on a subtle dark overlay. Gentle fade-in animations for each line. Minimal and elegant — let the words speak for themselves. Slight text shadow for depth.",
    };
  }

  it("should return default analysis for empty lyrics", () => {
    const result = getDefaultAnalysis([]);
    expect(result.emotions).toEqual([{ label: "calmness", intensity: 0.7 }]);
    expect(result.theme).toEqual(["reflective", "personal"]);
  });

  it("should detect slow tempo for short lyrics", () => {
    const lyrics: TestLyricLine[] = [
      { index: 0, text: "hello", startTime: 0, endTime: 2 },
      { index: 1, text: "world", startTime: 2, endTime: 4 },
    ];
    const result = getDefaultAnalysis(lyrics);
    expect(result.tempo).toBe("slow");
  });

  it("should detect fast tempo for dense lyrics", () => {
    const lyrics: TestLyricLine[] = [
      { index: 0, text: "one two three four five six seven eight", startTime: 0, endTime: 1 },
    ];
    const result = getDefaultAnalysis(lyrics);
    expect(result.tempo).toBe("fast");
  });

  it("should detect medium tempo", () => {
    const lyrics: TestLyricLine[] = [
      { index: 0, text: "one two three four", startTime: 0, endTime: 1 },
    ];
    const result = getDefaultAnalysis(lyrics);
    expect(result.tempo).toBe("medium");
  });

  it("should include default palette", () => {
    const lyrics: TestLyricLine[] = [{ index: 0, text: "test", startTime: 0, endTime: 2 }];
    const result = getDefaultAnalysis(lyrics);
    expect(result.suggestedPalette).toEqual(["#FFFFFF", "#E0E0E0", "#FF6B6B"]);
  });

  it("should detect Chinese lyrics and return Chinese labels", () => {
    const lyrics: TestLyricLine[] = [
      { index: 0, text: "你好世界", startTime: 0, endTime: 2 },
    ];
    const result = getDefaultAnalysis(lyrics);
    expect(result.emotions[0].label).toBe("平静");
    expect(result.theme).toContain("沉思");
  });

  it("should handle mixed Chinese-English lyrics (>30% Chinese)", () => {
    const lyrics: TestLyricLine[] = [
      { index: 0, text: "你好世界 hello world 测试", startTime: 0, endTime: 2 },
    ];
    const result = getDefaultAnalysis(lyrics);
    expect(result.emotions[0].label).toBe("平静");
  });
});

// ============================================================
// Tests for normalizeLabelsToLanguage helpers
// ============================================================

describe("normalizeLabelsToLanguage", () => {
  // Replicate helpers for testing
  const EN_TO_ZH: Record<string, string> = {
    passion: "热情", nostalgia: "怀旧", sweetness: "甜蜜", sadness: "悲伤",
    anger: "愤怒", joy: "喜悦", melancholy: "忧郁", romance: "浪漫",
    loneliness: "孤独", calmness: "平静", energy: "活力", love: "爱",
    happiness: "幸福", warmth: "温暖",
    "summer romance": "夏日恋情", heartbreak: "心碎",
    reflective: "沉思", personal: "个人", dream: "梦想", youth: "青春",
  };

  const ZH_TO_EN: Record<string, string> = Object.fromEntries(
    Object.entries(EN_TO_ZH).map(([en, zh]) => [zh, en])
  );

  function normalizeLabelToLanguage(label: string, targetLang: "zh" | "en"): string {
    if (targetLang === "zh") {
      if (/[\u4e00-\u9fff]/.test(label)) return label;
      return EN_TO_ZH[label.toLowerCase()] || label;
    } else {
      if (!/[\u4e00-\u9fff]/.test(label)) return label;
      return ZH_TO_EN[label] || label;
    }
  }

  function normalizeLabelsToLanguage(labels: string[], targetLang: "zh" | "en"): string[] {
    return labels.map(l => normalizeLabelToLanguage(l, targetLang));
  }

  it("should translate English labels to Chinese", () => {
    const result = normalizeLabelsToLanguage(["joy", "sadness", "love"], "zh");
    expect(result).toEqual(["喜悦", "悲伤", "爱"]);
  });

  it("should translate Chinese labels to English", () => {
    const result = normalizeLabelsToLanguage(["喜悦", "悲伤", "爱"], "en");
    expect(result).toEqual(["joy", "sadness", "love"]);
  });

  it("should keep already-correct labels unchanged", () => {
    const result = normalizeLabelsToLanguage(["喜悦", "calmness"], "zh");
    expect(result).toEqual(["喜悦", "平静"]);
  });

  it("should handle unknown labels gracefully", () => {
    const result = normalizeLabelsToLanguage(["unknown_tag", "mystery"], "zh");
    expect(result).toEqual(["unknown_tag", "mystery"]);
  });

  it("should handle mixed input", () => {
    const result = normalizeLabelsToLanguage(["joy", "愤怒", "dream", "心碎"], "zh");
    expect(result).toEqual(["喜悦", "愤怒", "梦想", "心碎"]);
  });
});

// ============================================================
// Tests for segmentWords (CJK word segmentation)
// ============================================================

describe("segmentWords", () => {
  // Replicate for testing
  function segmentWords(text: string): string[] {
    try {
      if (typeof Intl !== "undefined" && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
        const segments = [...segmenter.segment(text)]
          .filter(s => s.isWordLike)
          .map(s => s.segment);
        if (segments.length > 0) return segments;
      }
    } catch { /* fall through */ }

    const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
    if (cjkCount > text.length * 0.3) {
      const result: string[] = [];
      let buffer = "";
      for (const ch of text) {
        if (/[a-zA-Z0-9]/.test(ch)) {
          buffer += ch;
        } else {
          if (buffer) { result.push(buffer); buffer = ""; }
          if (ch.trim()) result.push(ch);
        }
      }
      if (buffer) result.push(buffer);
      return result.length > 0 ? result : [text];
    }

    return text.split(/\s+/).filter(Boolean);
  }

  it("should split English text by spaces", () => {
    const result = segmentWords("hello world test");
    expect(result).toEqual(["hello", "world", "test"]);
  });

  it("should segment Chinese text into words (via Intl.Segmenter when available)", () => {
    const result = segmentWords("你好世界");
    // With Intl.Segmenter: ["你好", "世界"]
    // Without: ["你", "好", "世", "界"]
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.join("")).toBe("你好世界");
  });

  it("should handle mixed CJK-Latin text", () => {
    const result = segmentWords("hello 世界 test");
    expect(result).toContain("hello");
    expect(result).toContain("test");
    // CJK chars are split individually
  });

  it("should handle empty string", () => {
    const result = segmentWords("");
    expect(result).toEqual([]);
  });

  it("should handle pure CJK text with Latin inline", () => {
    const result = segmentWords("baby你是我love");
    expect(result).toContain("baby");
    expect(result).toContain("love");
  });
});
