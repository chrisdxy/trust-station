import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "正道驿站 - Global Business Trust Ledger",
  description: "全球商业信任共建社区，让合作有迹可循，让成长和信任在真实交往中沉淀",
  openGraph: {
    title: "正道驿站 | Trust Station",
    description: "全球商业信任共建社区 — 让合作有迹可循，让成长和信任在真实交往中沉淀",
    url: "https://myfriends.vip",
    siteName: "正道驿站",
    images: [
      {
        url: "https://myfriends.vip/og-image.svg",
        width: 1200,
        height: 630,
        alt: "正道驿站"
      }
    ],
    locale: "zh_CN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "正道驿站 | Trust Station",
    description: "全球商业信任共建社区 — 让合作有迹可循，让成长和信任在真实交往中沉淀",
    images: ["https://myfriends.vip/og-image.svg"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
