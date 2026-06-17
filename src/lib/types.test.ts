import { describe, it, expect } from "vitest";
import {
  styleParamsToTemplate,
  STYLE_TEMPLATES,
  FILTER_PRESETS,
  FILTER_LABELS,
  ANIMATION_LABELS,
  DECORATION_LABELS,
} from "./types";
import type { StyleParams, AnimationType, DecorationType, FilterType } from "./types";

describe("styleParamsToTemplate", () => {
  const baseStyle: StyleParams = {
    fontFamily: "Inter, sans-serif",
    fontSize: 48,
    primaryColor: "#FFFFFF",
    secondaryColor: "#CCCCCC",
    accentColor: "#FF6B6B",
    animation: "fade-in",
    decoration: ["none"],
    fontWeight: 500,
    textShadow: false,
  };

  it("should generate a valid SubtitleTemplate", () => {
    const template = styleParamsToTemplate(baseStyle);
    expect(template.name).toBe("Custom Style");
    expect(template.layout.positionX).toBe(0.5);
    expect(template.layout.positionY).toBe(0.65);
    expect(template.layout.alternateMode).toBe("alternate");
    expect(template.animation.entrance).toBe("fade-in");
  });

  it("should pass through fontFamily", () => {
    const style = { ...baseStyle, fontFamily: "Georgia, serif" };
    const template = styleParamsToTemplate(style);
    expect(template.render.fontFamily).toBe("Georgia, serif");
  });

  it("should pass through fontSize", () => {
    const style = { ...baseStyle, fontSize: 72 };
    const template = styleParamsToTemplate(style);
    expect(template.render.fontSize).toBe(72);
  });

  it("should pass through animation type", () => {
    const animations: AnimationType[] = ["fade-in", "karaoke", "typewriter", "bounce", "scale-up", "slide-up", "none"];
    for (const anim of animations) {
      const style = { ...baseStyle, animation: anim };
      const template = styleParamsToTemplate(style);
      expect(template.animation.entrance).toBe(anim);
    }
  });

  it("should pass through colors", () => {
    const style = {
      ...baseStyle,
      primaryColor: "#111111",
      secondaryColor: "#222222",
      accentColor: "#333333",
    };
    const template = styleParamsToTemplate(style);
    expect(template.render.primaryColor).toBe("#111111");
    expect(template.render.secondaryColor).toBe("#222222");
    expect(template.render.accentColor).toBe("#333333");
  });

  it("should set glowColor to accentColor", () => {
    const style = { ...baseStyle, accentColor: "#FF0000" };
    const template = styleParamsToTemplate(style);
    expect(template.render.glowColor).toBe("#FF0000");
  });

  it("should use default backgroundType none", () => {
    const template = styleParamsToTemplate(baseStyle);
    expect(template.render.backgroundType).toBe("none");
  });
});

describe("STYLE_TEMPLATES", () => {
  it("should have all required style templates", () => {
    expect(STYLE_TEMPLATES).toHaveProperty("minimal-modern");
    expect(STYLE_TEMPLATES).toHaveProperty("vintage-film");
    expect(STYLE_TEMPLATES).toHaveProperty("journal-diary");
  });

  it("each template should have valid StyleParams shape", () => {
    for (const [key, params] of Object.entries(STYLE_TEMPLATES)) {
      expect(params, `${key} missing fontFamily`).toHaveProperty("fontFamily");
      expect(typeof params.fontSize, `${key} fontSize`).toBe("number");
      expect(params.primaryColor, `${key} primaryColor`).toMatch(/^#/);
      expect(params.secondaryColor, `${key} secondaryColor`).toMatch(/^#/);
      expect(params.accentColor, `${key} accentColor`).toMatch(/^#/);
      expect(params.animation, `${key} animation`).toBeTruthy();
      expect(Array.isArray(params.decoration), `${key} decoration`).toBe(true);
    }
  });
});

describe("FILTER_PRESETS", () => {
  it("should have all filter types defined", () => {
    const filterTypes: FilterType[] = ["original", "vintage", "film", "fresh", "bw", "warm", "cool", "faded"];
    for (const ft of filterTypes) {
      expect(FILTER_PRESETS[ft], `missing filter ${ft}`).toBeDefined();
    }
  });

  it("should have corresponding labels", () => {
    const filterTypes: FilterType[] = ["original", "vintage", "film", "fresh", "bw", "warm", "cool", "faded"];
    for (const ft of filterTypes) {
      expect(FILTER_LABELS[ft], `missing label for ${ft}`).toBeDefined();
    }
  });

  it("original filter should be 'none'", () => {
    expect(FILTER_PRESETS.original).toBe("none");
  });
});

describe("ANIMATION_LABELS", () => {
  it("should have labels for all animation types", () => {
    const types: AnimationType[] = ["none", "fade-in", "karaoke", "typewriter", "bounce", "scale-up", "slide-up"];
    for (const t of types) {
      expect(ANIMATION_LABELS[t], `missing label for ${t}`).toBeDefined();
    }
  });
});

describe("DECORATION_LABELS", () => {
  it("should have labels for all decoration types", () => {
    const types: DecorationType[] = ["none", "underline", "highlight", "border", "emoji"];
    for (const t of types) {
      expect(DECORATION_LABELS[t], `missing label for ${t}`).toBeDefined();
    }
  });
});
