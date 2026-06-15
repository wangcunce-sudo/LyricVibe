import Link from "next/link";
import { Sparkles, Music, Film, Wand2, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm mb-8">
          <Sparkles className="w-4 h-4" />
          AI-Powered Lyric Subtitle Video Generator
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Your lyrics,
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            your style.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Drop your video and audio. AI analyzes the emotions in your lyrics and
          generates a perfectly matched subtitle style — fonts, colors,
          animations, everything. Tweak it your way and export.
        </p>

        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-2xl shadow-purple-600/30"
        >
          Start Creating
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            icon={<Film className="w-8 h-8" />}
            step="1"
            title="Upload Your Media"
            description="Drop in your video clip and audio track. Or just audio — we'll generate a background for you."
          />
          <StepCard
            icon={<Sparkles className="w-8 h-8" />}
            step="2"
            title="AI Analyzes & Styles"
            description="AI extracts lyrics, detects emotions and themes, then generates a subtitle style that matches the mood."
          />
          <StepCard
            icon={<Wand2 className="w-8 h-8" />}
            step="3"
            title="Customize & Export"
            description="Tweak the style prompt, adjust filters, speed, pitch. Preview in real-time. Export when ready."
          />
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="text-purple-400 mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
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
    <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 text-purple-400 mb-4">
        {icon}
      </div>
      <div className="text-xs font-bold text-purple-400 mb-2">STEP {step}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

const features = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Emotion Detection",
    desc: "AI analyzes 8 emotions and themes from your lyrics to match the visual style.",
  },
  {
    icon: <Film className="w-5 h-5" />,
    title: "6 Subtitle Animations",
    desc: "Fade, karaoke highlight, typewriter, bounce, scale-up, slide-up — pick your vibe.",
  },
  {
    icon: <Music className="w-5 h-5" />,
    title: "Speed & Pitch",
    desc: "Speed 0.5x–2x with time-stretch, pitch ±12 semitones. Subtitles auto-sync.",
  },
  {
    icon: <Wand2 className="w-5 h-5" />,
    title: "Style Prompt",
    desc: "Describe the look you want in plain English. AI turns it into actual subtitle styling.",
  },
];
