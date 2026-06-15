/**
 * Demo data for Taylor Swift - The Fate of Ophelia
 * Pre-loaded for instant demo experience at hackathon.
 */

import type { LyricLine, AnalysisResult, StyleParams } from "./types";

// Full lyrics with time-aligned segments (manually timed for the 3:58 MV)
export const OPHELIA_LYRICS: LyricLine[] = [
  { index: 0, text: "I heard you calling on the megaphone", startTime: 8.5, endTime: 12.0 },
  { index: 1, text: "You wanna see me all alone", startTime: 12.0, endTime: 14.5 },
  { index: 2, text: "As legend has it, you are quite the pyro", startTime: 14.5, endTime: 18.5 },
  { index: 3, text: "You light the match to watch it blow", startTime: 18.5, endTime: 21.5 },
  { index: 4, text: "And if you'd never come for me", startTime: 22.0, endTime: 25.0 },
  { index: 5, text: "I might've drowned in the melancholy", startTime: 25.0, endTime: 28.5 },
  { index: 6, text: "I swore my loyalty to me, myself, and I", startTime: 28.5, endTime: 32.0 },
  { index: 7, text: "Right before you lit my sky up", startTime: 32.0, endTime: 35.0 },
  { index: 8, text: "All that time, I sat alone in my tower", startTime: 35.5, endTime: 39.0 },
  { index: 9, text: "You were just honing your powers", startTime: 39.0, endTime: 42.0 },
  { index: 10, text: "Now I can see it all", startTime: 42.0, endTime: 44.5 },
  { index: 11, text: "Late one night, you dug me out of my grave and", startTime: 44.5, endTime: 48.0 },
  { index: 12, text: "Saved my heart from the fate of Ophelia", startTime: 48.0, endTime: 52.0 },
  { index: 13, text: "Keep it one hundred on the land, the sea, the sky", startTime: 52.5, endTime: 56.5 },
  { index: 14, text: "Pledge allegiance to your hands, your team, your vibes", startTime: 56.5, endTime: 60.0 },
  { index: 15, text: "Don't care where the hell you been", startTime: 60.0, endTime: 62.5 },
  { index: 16, text: "'Cause now, you're mine", startTime: 62.5, endTime: 65.0 },
  { index: 17, text: "It's 'bout to be the sleepless night you've been dreaming of", startTime: 65.0, endTime: 69.0 },
  { index: 18, text: "The fate of Ophelia", startTime: 69.0, endTime: 71.0 },
  { index: 19, text: "The eldest daughter of a nobleman", startTime: 71.5, endTime: 74.5 },
  { index: 20, text: "Ophelia lived in fantasy", startTime: 74.5, endTime: 77.5 },
  { index: 21, text: "But love was a cold bed full of scorpions", startTime: 77.5, endTime: 81.0 },
  { index: 22, text: "The venom stole her sanity", startTime: 81.0, endTime: 84.0 },
  { index: 23, text: "And if you'd never come for me", startTime: 84.5, endTime: 87.0 },
  { index: 24, text: "I might've lingered in purgatory", startTime: 87.0, endTime: 90.5 },
  { index: 25, text: "You wrap around me like a chain, a crown, a vine", startTime: 90.5, endTime: 94.5 },
  { index: 26, text: "Pulling me into the fire", startTime: 94.5, endTime: 97.0 },
  { index: 27, text: "All that time, I sat alone in my tower", startTime: 97.5, endTime: 101.0 },
  { index: 28, text: "You were just honing your powers", startTime: 101.0, endTime: 104.0 },
  { index: 29, text: "Now I can see it all", startTime: 104.0, endTime: 106.5 },
  { index: 30, text: "Late one night, you dug me out of my grave and", startTime: 106.5, endTime: 110.0 },
  { index: 31, text: "Saved my heart from the fate of Ophelia", startTime: 110.0, endTime: 114.0 },
  { index: 32, text: "Keep it one hundred on the land, the sea, the sky", startTime: 114.5, endTime: 118.5 },
  { index: 33, text: "Pledge allegiance to your hands, your team, your vibes", startTime: 118.5, endTime: 122.0 },
  { index: 34, text: "Don't care where the hell you been", startTime: 122.0, endTime: 124.5 },
  { index: 35, text: "'Cause now, you're mine", startTime: 124.5, endTime: 127.0 },
  { index: 36, text: "It's 'bout to be the sleepless night you've been dreaming of", startTime: 127.0, endTime: 131.0 },
  { index: 37, text: "The fate of Ophelia", startTime: 131.0, endTime: 133.0 },
  { index: 38, text: "'Tis locked inside my memory", startTime: 133.5, endTime: 136.5 },
  { index: 39, text: "And only you possess the key", startTime: 136.5, endTime: 139.5 },
  { index: 40, text: "No longer drowning and deceived", startTime: 139.5, endTime: 142.5 },
  { index: 41, text: "All because you came for me", startTime: 142.5, endTime: 145.0 },
  { index: 42, text: "Locked inside my memory", startTime: 145.5, endTime: 148.0 },
  { index: 43, text: "And only you possess the key", startTime: 148.0, endTime: 151.0 },
  { index: 44, text: "No longer drowning and deceived", startTime: 151.0, endTime: 154.0 },
  { index: 45, text: "All because you came for me", startTime: 154.0, endTime: 156.5 },
  { index: 46, text: "All that time, I sat alone in my tower", startTime: 157.0, endTime: 160.5 },
  { index: 47, text: "You were just honing your powers", startTime: 160.5, endTime: 163.5 },
  { index: 48, text: "Now I can see it all", startTime: 163.5, endTime: 166.0 },
  { index: 49, text: "Late one night, you dug me out of my grave and", startTime: 166.0, endTime: 169.5 },
  { index: 50, text: "Saved my heart from the fate of Ophelia", startTime: 169.5, endTime: 173.5 },
  { index: 51, text: "Keep it one hundred on the land, the sea, the sky", startTime: 174.0, endTime: 178.0 },
  { index: 52, text: "Pledge allegiance to your hands, your team, your vibes", startTime: 178.0, endTime: 182.0 },
  { index: 53, text: "Don't care where the hell you been", startTime: 182.0, endTime: 184.5 },
  { index: 54, text: "'Cause now, you're mine", startTime: 184.5, endTime: 187.0 },
  { index: 55, text: "It's 'bout to be the sleepless night you've been dreaming of", startTime: 187.0, endTime: 191.0 },
  { index: 56, text: "The fate of Ophelia", startTime: 191.0, endTime: 193.5 },
  { index: 57, text: "You saved my heart from the fate of Ophelia", startTime: 193.5, endTime: 200.0 },
];

// Pre-computed AI analysis result for Ophelia
export const OPHELIA_ANALYSIS: AnalysisResult = {
  emotions: [
    { label: "passion", intensity: 0.85 },
    { label: "nostalgia", intensity: 0.7 },
    { label: "sweetness", intensity: 0.55 },
    { label: "sadness", intensity: 0.4 },
  ],
  theme: [
    "Shakespearean romance",
    "rescue from darkness",
    "medieval meets modern",
    "fated love",
  ],
  tempo: "medium",
  suggestedPalette: ["#D4AF37", "#1A0A2E", "#C41E3A"],
  suggestedFontStyle: "elegant serif with dramatic flair",
  stylePrompt:
    "Golden serif typography against deep royal purple, like illuminated manuscript meets modern pop. Each line emerges with a regal fade, accented by subtle gold sparkle particles. The chorus explodes in rich crimson — a theatrical, Shakespearean-meets-Broadway aesthetic. Text shadows evoke candlelit chambers and velvet curtains.",
};

// Pre-computed style params matching the analysis
export const OPHELIA_STYLE: StyleParams = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 42,
  primaryColor: "#D4AF37",
  secondaryColor: "#8B7355",
  accentColor: "#C41E3A",
  animation: "fade-in",
  decoration: ["underline"],
  fontWeight: 600,
  textShadow: true,
};

// Alternative styles for demo variety
export const ALTERNATIVE_STYLES: Record<string, StyleParams> = {
  "gothic-drama": {
    fontFamily: "'Cinzel', serif",
    fontSize: 46,
    primaryColor: "#E8D5C4",
    secondaryColor: "#8B0000",
    accentColor: "#FF4500",
    animation: "karaoke",
    decoration: ["border"],
    fontWeight: 700,
    textShadow: true,
  },
  "modern-pop": {
    fontFamily: "Inter, sans-serif",
    fontSize: 52,
    primaryColor: "#FFFFFF",
    secondaryColor: "#FFD700",
    accentColor: "#FF1493",
    animation: "bounce",
    decoration: ["emoji"],
    fontWeight: 700,
    textShadow: false,
  },
  "vintage-journal": {
    fontFamily: "'Caveat', cursive",
    fontSize: 44,
    primaryColor: "#2C1810",
    secondaryColor: "#8B5E3C",
    accentColor: "#D4AF37",
    animation: "slide-up",
    decoration: ["emoji", "highlight"],
    fontWeight: 400,
    textShadow: false,
  },
};
