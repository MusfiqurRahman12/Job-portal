import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://futuretalent.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        // OpenAI's Search & Web Crawler
        userAgent: "GPTbot",
        allow: "/",
      },
      {
        // Anthropic's Web Crawler
        userAgent: "ClaudeBot",
        allow: "/",
      },
      {
        // Google's AI Training Web Crawler
        userAgent: "Google-Extended",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
