import type { Metadata } from "next";
import { Bowlby_One, Cormorant_Garamond, Nanum_Myeongjo, Oswald } from "next/font/google";
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

// 티켓 전용 (ticket.png 레퍼런스의 굵은 제목체·좁은 본문체)
const ticketTitle = Bowlby_One({
  variable: "--font-ticket-title",
  subsets: ["latin"],
  weight: "400",
});

const ticket = Oswald({
  variable: "--font-ticket",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "할로윈 저녁 초대장",
  description: "이 계절의 만찬에 귀하를 초대합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} ${ticketTitle.variable} ${ticket.variable}`}>
      <body>{children}</body>
    </html>
  );
}
