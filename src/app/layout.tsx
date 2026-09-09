import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Monee — Quản lý tài chính cá nhân",
  description: "Theo dõi tiền bạc rõ ràng, nhẹ nhàng và an toàn.",
  applicationName: "Monee",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f6f7f4",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body><ThemeProvider><PwaRegister />{children}</ThemeProvider></body>
    </html>
  );
}
