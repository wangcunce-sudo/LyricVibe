import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "./ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "音动字生 — AI 个性化歌词字幕 MV 生成器",
  description:
    "将你的视频和音乐变成精美的歌词字幕 MV。AI 分析情感，生成匹配的字幕样式，一切由你自定义。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className={`${inter.variable} antialiased bg-gradient-to-b from-sky-50 via-white to-blue-50 min-h-screen`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
