import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "할로윈 저녁 초대장",
  description: "이 계절의 만찬에 귀하를 초대합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
