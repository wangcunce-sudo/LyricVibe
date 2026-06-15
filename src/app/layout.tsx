import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LyricVibe — AI Personalized Lyric Video Maker",
  description:
    "Turn your videos and music into beautiful lyric subtitle videos. AI analyzes emotions, generates matching subtitle styles, and lets you customize everything.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
