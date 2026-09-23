import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:5173";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "Ariadne · 从一个念头开始",
    description: "一个安静的个人空间，把想法、项目与真实投入慢慢连起来。",
    icons: { icon: "/favicon.svg" },
    openGraph: {
      title: "Ariadne · 从一个念头开始",
      description: "记录灵感，推进项目，看见时间留下的路径。",
      type: "website",
      images: [{ url: ogImage, width: 1734, height: 907, alt: "Ariadne 个人思考与计划空间" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Ariadne · 从一个念头开始",
      description: "记录灵感，推进项目，看见时间留下的路径。",
      images: [ogImage],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
