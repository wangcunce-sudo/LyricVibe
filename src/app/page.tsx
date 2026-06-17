"use client";

import Link from "next/link";
import { Sparkles, Music, Film, Wand2, ArrowRight, Play, Upload, Mic, FileVideo, Bird } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LangSwitch } from "@/components/LangSwitch";

function SeagullSvg({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 18 Q10 0 20 10 Q30 0 40 18"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M6 16 Q14 6 20 12"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M34 16 Q26 6 20 12"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const dict = t("home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50 text-gray-800 relative overflow-hidden">
      {/* ── Animated seagulls ── */}
      <div className="absolute top-20 left-10 opacity-20 animate-seagull-fly text-sky-600">
        <SeagullSvg size={36} />
      </div>
      <div className="absolute top-40 right-20 opacity-15 animate-seagull-fly-reverse text-blue-500" style={{ animationDelay: "2s" }}>
        <SeagullSvg size={28} />
      </div>
      <div className="absolute top-60 left-1/3 opacity-10 animate-seagull-fly text-sky-400" style={{ animationDelay: "4s" }}>
        <SeagullSvg size={44} />
      </div>
      <div className="absolute bottom-40 right-10 opacity-15 animate-seagull-fly-reverse text-blue-400" style={{ animationDelay: "6s" }}>
        <SeagullSvg size={32} />
      </div>

      {/* ── Wave decoration ── */}
      <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden opacity-10 pointer-events-none">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-[200%] h-full animate-wave-move">
          <path d="M0,60 C150,0 300,120 450,60 C600,0 750,120 900,60 C1050,0 1200,120 1350,60 L1350,120 L0,120 Z" fill="#0ea5e9" />
        </svg>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-[200%] h-full animate-wave-move opacity-50" style={{ animationDelay: "-5s", animationDuration: "25s" }}>
          <path d="M0,80 C200,20 400,100 600,80 C800,20 1000,100 1200,80 L1200,120 L0,120 Z" fill="#38bdf8" />
        </svg>
      </div>

      {/* Lang switch */}
      <div className="max-w-5xl mx-auto px-6 pt-4 flex justify-end relative z-10">
        <LangSwitch />
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 border border-sky-200 text-sky-600 text-sm mb-8">
          <Sparkles className="w-4 h-4" />
          {dict.badge}
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-800">
          {dict.heroLine1}
          <br />
          <span className="bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
            {dict.heroLine2}
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          {dict.heroDesc}
        </p>

        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-2xl shadow-sky-500/25 text-white"
        >
          {dict.cta}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Demo Video Showcase */}
      <div className="max-w-4xl mx-auto px-6 pb-16 relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <Bird className="w-6 h-6 text-sky-400" />
            🎬 生成效果预览
          </h2>
          <p className="text-gray-400 text-sm">
            opalite-tiktok热舞 + WhisperX AI歌词识别 + 蓝白弹跳字幕模板 = 最终效果
          </p>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-sky-500/15 border border-sky-100 bg-black">
          <video
            src="/lyricvibe_demo_mv.mp4"
            controls
            playsInline
            preload="auto"
            className="w-full aspect-video"
            style={{ backgroundColor: "#000" }}
          >
            您的浏览器不支持视频播放
          </video>
        </div>
        <div className="flex justify-center gap-3 mt-4 flex-wrap">
          <span className="px-3 py-1 bg-sky-100 border border-sky-200 text-sky-600 text-xs rounded-full">
            🎵 原始音频
          </span>
          <span className="px-3 py-1 bg-blue-100 border border-blue-200 text-blue-600 text-xs rounded-full">
            🤖 WhisperX AI 识别
          </span>
          <span className="px-3 py-1 bg-cyan-100 border border-cyan-200 text-cyan-600 text-xs rounded-full">
            ✨ 弹跳动效字幕
          </span>
          <span className="px-3 py-1 bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs rounded-full">
            🎬 Remotion 渲染
          </span>
        </div>
      </div>

      {/* Pipeline showcase */}
      <div className="max-w-5xl mx-auto px-6 pb-16 relative z-10">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
          ⚡ 创作流程
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
          <PipelineStep icon={<Upload className="w-6 h-6" />} title="上传素材" desc="视频 + 音频" color="from-sky-500 to-blue-600" />
          <PipelineArrow />
          <PipelineStep icon={<Mic className="w-6 h-6" />} title="WhisperX 识别" desc="Demucs + large-v3" color="from-blue-500 to-cyan-500" />
          <PipelineArrow />
          <PipelineStep icon={<Wand2 className="w-6 h-6" />} title="AI 分析 & 模板" desc="情感 + 动效字幕" color="from-cyan-500 to-teal-500" />
          <PipelineArrow />
          <PipelineStep icon={<FileVideo className="w-6 h-6" />} title="Remotion 渲染" desc="导出 MP4" color="from-teal-500 to-emerald-500" />
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 pb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            icon={<Film className="w-8 h-8" />}
            step="1"
            title={dict.step1Title}
            description={dict.step1Desc}
          />
          <StepCard
            icon={<Sparkles className="w-8 h-8" />}
            step="2"
            title={dict.step2Title}
            description={dict.step2Desc}
          />
          <StepCard
            icon={<Wand2 className="w-8 h-8" />}
            step="3"
            title={dict.step3Title}
            description={dict.step3Desc}
          />
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24 relative z-10">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          {dict.featuresHeading}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Sparkles className="w-5 h-5" />, title: "提示词生成字幕模板", desc: "用自然语言描述你想要的字幕效果——弧度、位置、动画——AI即时生成" },
            { icon: <Film className="w-5 h-5" />, title: "WhisperX 精确时间轴", desc: "Demucs音源分离 + large-v3 转录，精确到逐字级别" },
            { icon: <Music className="w-5 h-5" />, title: "实时预览 + 渲染", desc: "Canvas实时预览字幕效果，Remotion渲染高质量MP4" },
            { icon: <Wand2 className="w-5 h-5" />, title: "上传视频+音频", desc: "支持任意视频+音频上传，全流程自动处理输出成品" },
          ].map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl bg-white border border-sky-100 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/50 transition-all"
            >
              <div className="text-sky-500 mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1 text-gray-800">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineStep({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white border border-sky-100 shadow-sm min-w-[140px]">
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg text-white`}>
        {icon}
      </div>
      <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
      <p className="text-xs text-gray-400 mt-1">{desc}</p>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex items-center justify-center text-sky-300 rotate-90 md:rotate-0">
      <ArrowRight className="w-5 h-5" />
    </div>
  );
}

function StepCard({
  icon,
  step,
  title,
  description,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-8 rounded-2xl bg-white border border-sky-100 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/50 transition-all">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-50 text-sky-500 mb-4">
        {icon}
      </div>
      <div className="text-xs font-bold text-sky-500 mb-2">STEP {step}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}
