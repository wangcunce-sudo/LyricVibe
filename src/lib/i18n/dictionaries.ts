/**
 * i18n dictionaries — all user-facing text in Chinese (default) and English.
 */

export type Locale = "zh" | "en";

// ── Layout ──────────────────────────────────────────────
const layoutDict = {
  zh: {
    title: "LyricVibe — AI 个性化歌词字幕 MV 生成器",
    description:
      "将你的视频和音乐变成精美的歌词字幕 MV。AI 分析情感，生成匹配的字幕样式，一切由你自定义。",
  },
  en: {
    title: "LyricVibe — AI Personalized Lyric Video Maker",
    description:
      "Turn your videos and music into beautiful lyric subtitle videos. AI analyzes emotions, generates matching subtitle styles, and lets you customize everything.",
  },
};

// ── Homepage ─────────────────────────────────────────────
const homeDict = {
  zh: {
    badge: "AI 驱动的歌词字幕 MV 生成器",
    heroLine1: "你的歌词，",
    heroLine2: "你的风格。",
    heroDesc:
      "拖入你的视频和音频。AI 分析歌词中的情感，自动生成完美匹配的字幕样式——字体、颜色、动画，全部搞定。随心调整，一键导出。",
    cta: "开始创作",
    step1Title: "上传你的媒体",
    step1Desc: "拖入你的视频片段和音频轨道。或者只用音频——我们会为你生成背景。",
    step2Title: "AI 分析与风格生成",
    step2Desc: "AI 提取歌词，检测情感和主题，然后生成与情绪完美匹配的字幕样式。",
    step3Title: "自定义 & 导出",
    step3Desc: "调整风格提示词、滤镜、速度、音高。实时预览。准备好后一键导出。",
    featuresHeading: "你所需的一切",
    feature1Title: "情感检测",
    feature1Desc: "AI 从歌词中分析 8 种情感和主题，匹配视觉风格。",
    feature2Title: "6 种字幕动画",
    feature2Desc: "淡入、卡拉 OK 高亮、打字机、弹跳、放大、上滑——随心选择。",
    feature3Title: "速度 & 音高",
    feature3Desc: "0.5x–2x 变速（时间拉伸），音高 ±12 半音。字幕自动同步。",
    feature4Title: "风格提示词",
    feature4Desc: "用自然语言描述你想要的视觉效果，AI 将其转化为实际字幕样式。",
  },
  en: {
    badge: "AI-Powered Lyric Subtitle Video Generator",
    heroLine1: "Your lyrics,",
    heroLine2: "your style.",
    heroDesc:
      "Drop your video and audio. AI analyzes the emotions in your lyrics and generates a perfectly matched subtitle style — fonts, colors, animations, everything. Tweak it your way and export.",
    cta: "Start Creating",
    step1Title: "Upload Your Media",
    step1Desc:
      "Drop in your video clip and audio track. Or just audio — we'll generate a background for you.",
    step2Title: "AI Analyzes & Styles",
    step2Desc:
      "AI extracts lyrics, detects emotions and themes, then generates a subtitle style that matches the mood.",
    step3Title: "Customize & Export",
    step3Desc:
      "Tweak the style prompt, adjust filters, speed, pitch. Preview in real-time. Export when ready.",
    featuresHeading: "Everything you need",
    feature1Title: "Emotion Detection",
    feature1Desc:
      "AI analyzes 8 emotions and themes from your lyrics to match the visual style.",
    feature2Title: "6 Subtitle Animations",
    feature2Desc:
      "Fade, karaoke highlight, typewriter, bounce, scale-up, slide-up — pick your vibe.",
    feature3Title: "Speed & Pitch",
    feature3Desc:
      "Speed 0.5x–2x with time-stretch, pitch ±12 semitones. Subtitles auto-sync.",
    feature4Title: "Style Prompt",
    feature4Desc:
      "Describe the look you want in plain English. AI turns it into actual subtitle styling.",
  },
};

// ── Create Page ──────────────────────────────────────────
const createDict = {
  zh: {
    back: "返回",
    appName: "LyricVibe",
    demoMode: "演示模式",
    tryDemo: "体验演示",
    tryDemoTitle: "体验演示 — opalite-tiktok热舞",
    demoSubtext: "预加载：opalite-tiktok热舞 MV + AI 风格分析",
    exporting: "导出中...",
    export: "导出",
    or: "或者",
    analyzing: "正在分析你的歌词...",
    analyzingSub: "正在检测情感、主题，生成视觉风格",
    demoReady: "演示就绪！",
    mediaLoaded: "媒体已加载！",
    analyzeBtn: "✨ 分析歌词并生成样式",
    videoReady: "视频已生成！",
    videoReadyDesc: "你的歌词字幕视频已成功生成。",
    download: "下载 MP4",
    close: "关闭",
  },
  en: {
    back: "Back",
    appName: "LyricVibe",
    demoMode: "Demo Mode",
    tryDemo: "Try Demo",
    tryDemoTitle: "Try Demo — opalite-tiktok热舞",
    demoSubtext: 'Pre-loaded: "opalite" hot dance MV + AI style analysis',
    exporting: "Exporting...",
    export: "Export",
    or: "or",
    analyzing: "Analyzing your lyrics...",
    analyzingSub: "Detecting emotions, themes, and generating visual style",
    demoReady: "Demo ready!",
    mediaLoaded: "Media loaded!",
    analyzeBtn: "✨ Analyze Lyrics & Generate Style",
    videoReady: "Video Ready!",
    videoReadyDesc: "Your lyric subtitle video has been generated successfully.",
    download: "Download MP4",
    close: "Close",
  },
};

// ── FileUpload ───────────────────────────────────────────
const fileUploadDict = {
  zh: {
    dropVideo: "拖入视频文件",
    videoFormats: "MP4, MOV, WebM（必需）",
    dropAudio: "拖入音频文件",
    audioFormats: "MP3, WAV, AAC（可选，默认使用视频音轨）",
    remove: "移除",
    uploading: "上传中...",
    audioOptionalHint: "不上传音频时，将自动从视频中提取音轨",
  },
  en: {
    dropVideo: "Drop your video here",
    videoFormats: "MP4, MOV, WebM (required)",
    dropAudio: "Drop your audio here",
    audioFormats: "MP3, WAV, AAC (optional, uses video audio by default)",
    remove: "Remove",
    uploading: "Uploading...",
    audioOptionalHint: "If no audio is uploaded, audio will be extracted from the video",
  },
};

// ── ControlPanel ─────────────────────────────────────────
const controlPanelDict = {
  zh: {
    tabs: {
      style: "风格",
      filter: "滤镜",
      audio: "音频",
      advanced: "高级",
    },
    style: {
      noAnalysis: "上传音频以分析歌词并生成样式",
      analyzing: "分析中...",
      analyzeBtn: "✨ 分析歌词",
      emotions: "情感",
      theme: "主题",
      tempo: "节奏",
      stylePrompt: "风格提示词（AI 生成的字幕模板描述）",
      stylePromptPlaceholder: "AI 将基于歌词情感生成字幕模板提示词...",
      applyStyle: "应用到 AI 字幕模板",
      regenerate: "重新生成",
      quickTemplates: "快捷模板",
      styleVariations: "风格变体",
    },
    filter: {
      videoFilter: "视频滤镜",
      preview: "预览",
      labels: {
        original: "原图",
        vintage: "复古",
        film: "胶片",
        fresh: "清新",
        bw: "黑白",
        warm: "暖色",
        cool: "冷色",
        faded: "褪色",
      },
    },
    audio: {
      speed: "速度",
      normal: "正常",
      pitch: "音高",
      original: "原调",
      semitones: "半音",
      tip: "💡 变速使用时间拉伸（保持音高不变）。变调保持速度不变。两者均自动与字幕时间同步。由 Tone.js 音频引擎驱动。",
    },
    advanced: {
      fontSize: "字号",
      fontWeight: "字重",
      animation: "动画",
      decoration: "装饰",
      textShadow: "文字阴影",
      colors: "颜色",
      animationLabels: {
        none: "无",
        "fade-in": "淡入",
        karaoke: "卡拉OK",
        typewriter: "打字机",
        bounce: "弹跳",
        "scale-up": "放大",
        "slide-up": "上滑",
      },
      decorationLabels: {
        none: "无",
        underline: "下划线",
        highlight: "高亮",
        border: "边框",
        emoji: "表情",
      },
    },
  },
  en: {
    tabs: {
      style: "Style",
      filter: "Filter",
      audio: "Audio",
      advanced: "Advanced",
    },
    style: {
      noAnalysis: "Upload audio to analyze lyrics and generate style",
      analyzing: "Analyzing...",
      analyzeBtn: "✨ Analyze Lyrics",
      emotions: "Emotions",
      theme: "Theme",
      tempo: "Tempo",
      stylePrompt: "Style Prompt (AI-generated template description)",
      stylePromptPlaceholder: "AI will generate a subtitle template prompt based on lyrics mood...",
      applyStyle: "Apply to AI Template",
      regenerate: "Regenerate",
      quickTemplates: "Quick Templates",
      styleVariations: "Style Variations",
    },
    filter: {
      videoFilter: "Video Filter",
      preview: "Preview",
      labels: {
        original: "Original",
        vintage: "Vintage",
        film: "Film",
        fresh: "Fresh",
        bw: "B&W",
        warm: "Warm",
        cool: "Cool",
        faded: "Faded",
      },
    },
    audio: {
      speed: "Speed",
      normal: "normal",
      pitch: "Pitch",
      original: "original",
      semitones: "semitones",
      tip: "💡 Speed change uses time-stretch (preserves pitch). Pitch change preserves speed. Both sync with subtitle timing automatically. Powered by Tone.js audio engine.",
    },
    advanced: {
      fontSize: "Font Size",
      fontWeight: "Font Weight",
      animation: "Animation",
      decoration: "Decoration",
      textShadow: "Text Shadow",
      colors: "Colors",
      animationLabels: {
        none: "None",
        "fade-in": "Fade In",
        karaoke: "Karaoke",
        typewriter: "Typewriter",
        bounce: "Bounce",
        "scale-up": "Scale Up",
        "slide-up": "Slide Up",
      },
      decorationLabels: {
        none: "None",
        underline: "Underline",
        highlight: "Highlight",
        border: "Border",
        emoji: "Emoji",
      },
    },
  },
};

// ── Emotion / Theme labels (AI output, kept in English keys, display in locale) ──
const emotionThemeDict = {
  zh: {
    // Emotions — English keys from AI → Chinese display
    passion: "热情",
    nostalgia: "怀旧",
    sweetness: "甜蜜",
    sadness: "悲伤",
    anger: "愤怒",
    joy: "喜悦",
    melancholy: "忧郁",
    romance: "浪漫",
    loneliness: "孤独",
    calmness: "平静",
    energy: "活力",
    triumph: "胜利",
    excitement: "兴奋",
    hope: "希望",
    longing: "渴望",
    love: "爱",
    happiness: "幸福",
    pride: "骄傲",
    regret: "遗憾",
    warmth: "温暖",
    playfulness: "俏皮",
    rebellion: "叛逆",
    // Emotions — Chinese keys (AI may return Chinese directly)
    "热情": "热情",
    "怀旧": "怀旧",
    "甜蜜": "甜蜜",
    "悲伤": "悲伤",
    "愤怒": "愤怒",
    "喜悦": "喜悦",
    "忧郁": "忧郁",
    "浪漫": "浪漫",
    "孤独": "孤独",
    "平静": "平静",
    "活力": "活力",
    "胜利": "胜利",
    "兴奋": "兴奋",
    "希望": "希望",
    "渴望": "渴望",
    "爱": "爱",
    "爱情": "爱情",
    "幸福": "幸福",
    "骄傲": "骄傲",
    "遗憾": "遗憾",
    "温暖": "温暖",
    "俏皮": "俏皮",
    "叛逆": "叛逆",
    // Tempo
    slow: "慢速",
    medium: "中速",
    fast: "快速",
    // Theme tags — English keys
    "dance & movement": "舞蹈与律动",
    "electric energy": "电流能量",
    "storm to sunshine": "风雨见晴",
    empowerment: "自我赋权",
    "summer romance": "夏日恋情",
    heartbreak: "心碎",
    "road trip": "公路旅行",
    "self-discovery": "自我发现",
    friendship: "友情",
    "coming of age": "成长",
    reflective: "沉思",
    personal: "个人",
    dream: "梦想",
    youth: "青春",
    freedom: "自由",
    adventure: "冒险",
    party: "派对",
    nature: "自然",
    city: "城市",
    summer: "夏日",
    winter: "冬季",
    healing: "治愈",
    growth: "成长",
    // Theme tags — Chinese keys (AI may return Chinese directly)
    "舞蹈与律动": "舞蹈与律动",
    "电流能量": "电流能量",
    "风雨见晴": "风雨见晴",
    "自我赋权": "自我赋权",
    "夏日恋情": "夏日恋情",
    "心碎": "心碎",
    "公路旅行": "公路旅行",
    "自我发现": "自我发现",
    "友情": "友情",
    "派对": "派对",
    "自然": "自然",
    "城市": "城市",
  } as Record<string, string>,
  en: {} as Record<string, string>, // fallback: use key directly
};

// ── Combined dictionary ──────────────────────────────────
export const DICT = {
  layout: layoutDict,
  home: homeDict,
  create: createDict,
  fileUpload: fileUploadDict,
  controlPanel: controlPanelDict,
  emotionTheme: emotionThemeDict,
} as const;

/** Translate an emotion/tempo label */
export function tEmotion(key: string, locale: Locale): string {
  if (locale === "zh" && emotionThemeDict.zh[key]) {
    return emotionThemeDict.zh[key];
  }
  return key;
}
