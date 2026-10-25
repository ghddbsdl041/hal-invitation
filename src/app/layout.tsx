import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.scss";

// 제목용 (봉투·편지 제목, 섹션 제목, 티켓 제목)
const display = localFont({
  src: "./fonts/DeoUahanSerif.woff2",
  variable: "--font-display",
});

// 나머지 본문 전체
const body = localFont({
  src: "./fonts/OkDanDan-Bold.woff2",
  weight: "700", // Bold 파일이라 굵게 지정된 곳에 가짜 볼드가 덧씌워지지 않게
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "할로윈 저녁 초대장",
  description: "이 계절의 만찬에 귀하를 초대합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
