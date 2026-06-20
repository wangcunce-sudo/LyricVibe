import { describe, it, expect } from "vitest";
import {
  styleParamsToTemplate,
  mergeTemplateWithStyle,
  STYLE_TEMPLATES,
  FILTER_PRESETS,
  FILTER_LABELS,
  ANIMATION_LABELS,
  DECORATION_LABELS,
} from "./types";
import type { StyleParams, AnimationType, DecorationType, FilterType, SubtitleTemplate } from "./types";

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
    expect(template.layout.positionY).toBe(0.6);
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

// ============================================================
// Tests for mergeTemplateWithStyle
// ============================================================

describe("mergeTemplateWithStyle", () => {
  const baseTemplate: SubtitleTemplate = {
    name: "Test",
    description: "test",
    layout: {
      positionX: 0.5,
      positionY: 0.65,
      alternateMode: "alternate",
      alternateAmplitude: 0.3,
      curvature: 0.1,
      maxWidthRatio: 0.8,
      lineSpacing: 1.4,
    },
    animation: {
      entrance: "fade-in",
      entranceDuration: 0.3,
      exit: "fade-in",
      exitDuration: 0.2,
      bounciness: 0.5,
      easing: "ease",
    },
    render: {
      fontFamily: "Arial",
      fontSize: 40,
      fontWeight: 400,
      primaryColor: "#AAA",
      secondaryColor: "#BBB",
      accentColor: "#CCC",
      textShadow: false,
      glowColor: "#DDD",
      glowIntensity: 0.3,
      strokeWidth: 0,
      strokeColor: "#000",
      backgroundType: "none",
      backgroundColor: "transparent",
      paddingX: 10,
      paddingY: 5,
      borderRadius: 0,
    },
  };

  const overrideStyle: StyleParams = {
    fontFamily: "Georgia, serif",
    fontSize: 64,
    primaryColor: "#FFFFFF",
    secondaryColor: "#FF0000",
    accentColor: "#00FF00",
    animation: "bounce",
    decoration: ["emoji"],
    fontWeight: 700,
    textShadow: true,
  };

  it("should override render properties from styleParams", () => {
    const merged = mergeTemplateWithStyle(baseTemplate, overrideStyle);
    expect(merged.render.fontFamily).toBe("Georgia, serif");
    expect(merged.render.fontSize).toBe(64);
    expect(merged.render.fontWeight).toBe(700);
    expect(merged.render.primaryColor).toBe("#FFFFFF");
    expect(merged.render.secondaryColor).toBe("#FF0000");
    expect(merged.render.accentColor).toBe("#00FF00");
    expect(merged.render.textShadow).toBe(true);
  });

  it("should override animation entrance from styleParams", () => {
    const merged = mergeTemplateWithStyle(baseTemplate, overrideStyle);
    expect(merged.animation.entrance).toBe("bounce");
  });

  it("should preserve layout properties unchanged", () => {
    const merged = mergeTemplateWithStyle(baseTemplate, overrideStyle);
    expect(merged.layout.positionX).toBe(0.5);
    expect(merged.layout.positionY).toBe(0.65);
    expect(merged.layout.curvature).toBe(0.1);
    expect(merged.layout.alternateMode).toBe("alternate");
  });

  it("should preserve animation properties not in styleParams", () => {
    const merged = mergeTemplateWithStyle(baseTemplate, overrideStyle);
    expect(merged.animation.entranceDuration).toBe(0.3);
    expect(merged.animation.exitDuration).toBe(0.2);
    expect(merged.animation.bounciness).toBe(0.5);
    expect(merged.animation.easing).toBe("ease");
  });

  it("should preserve template name and description", () => {
    const merged = mergeTemplateWithStyle(baseTemplate, overrideStyle);
    expect(merged.name).toBe("Test");
    expect(merged.description).toBe("test");
  });

  it("should not mutate original template", () => {
    const originalLayout = { ...baseTemplate.layout };
    const originalRender = { ...baseTemplate.render };
    mergeTemplateWithStyle(baseTemplate, overrideStyle);
    // Original should be unchanged
    expect(baseTemplate.layout).toEqual(originalLayout);
    expect(baseTemplate.render).toEqual(originalRender);
  });
});
