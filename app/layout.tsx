import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Flow | Quản lý nội dung",
  description: "Quản lý, duyệt và lên lịch nội dung mạng xã hội",
  icons: {
    icon: "/images/favicon.ico",
    shortcut: "/images/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
