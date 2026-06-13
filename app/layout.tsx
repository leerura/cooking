import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이거가능?",
  description: "유튜브 레시피, 내 재료로 가능한지 먼저 확인하기"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
