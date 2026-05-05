import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "高宏学生管理系统",
  description: "艺考文补机构学生管理后台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
