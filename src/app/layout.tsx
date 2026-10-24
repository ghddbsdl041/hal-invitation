import type { Metadata } from "next";
import { Cormorant_Garamond, Nanum_Myeongjo } from "next/font/google";
import "./globals.scss";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const body = Nanum_Myeongjo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700"],
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
