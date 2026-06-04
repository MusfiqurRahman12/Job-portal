import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.futuretalent.online";

  return {
    rules: [
      // ─── Default: Allow all crawlers to everything ───────────────────────
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/admin/", "/admin/"],
      },

      // ─── OpenAI / ChatGPT ────────────────────────────────────────────────
      {
        userAgent: "GPTBot",           // OpenAI's primary web crawler
        allow: "/",
      },
      {
        userAgent: "OAI-SearchBot",    // OpenAI's search-specific bot
        allow: "/",
      },
      {
        userAgent: "ChatGPT-User",     // Real-time ChatGPT browsing
        allow: "/",
      },

      // ─── Anthropic / Claude ──────────────────────────────────────────────
      {
        userAgent: "ClaudeBot",        // Anthropic's web crawler
        allow: "/",
      },
      {
        userAgent: "anthropic-ai",     // Anthropic training crawler
        allow: "/",
      },
      {
        userAgent: "Claude-Web",       // Claude web browsing agent
        allow: "/",
      },

      // ─── Google ──────────────────────────────────────────────────────────
      {
        userAgent: "Googlebot",        // Google's primary web crawler
        allow: "/",
      },
      {
        userAgent: "Google-Extended",  // Google's AI training crawler (Bard/Gemini)
        allow: "/",
      },
      {
        userAgent: "Googlebot-News",   // Google News crawler
        allow: "/",
      },
      {
        userAgent: "AdsBot-Google",    // Google Ads quality bot
        allow: "/",
      },

      // ─── Perplexity AI ───────────────────────────────────────────────────
      {
        userAgent: "PerplexityBot",    // Perplexity AI crawler
        allow: "/",
      },

      // ─── Microsoft Bing & Copilot ─────────────────────────────────────────
      {
        userAgent: "Bingbot",          // Bing search crawler
        allow: "/",
      },
      {
        userAgent: "BingPreview",      // Bing link preview
        allow: "/",
      },

      // ─── Meta AI ──────────────────────────────────────────────────────────
      {
        userAgent: "Meta-ExternalAgent", // Meta AI crawler
        allow: "/",
      },
      {
        userAgent: "FacebookBot",       // Facebook link preview & AI
        allow: "/",
      },

      // ─── Apple ────────────────────────────────────────────────────────────
      {
        userAgent: "Applebot",          // Apple Siri & Spotlight
        allow: "/",
      },
      {
        userAgent: "Applebot-Extended", // Apple AI training crawler
        allow: "/",
      },

      // ─── Common Crawl (used by many AI labs) ──────────────────────────────
      {
        userAgent: "CCBot",             // CommonCrawl - used by many AI models
        allow: "/",
      },

      // ─── Cohere ──────────────────────────────────────────────────────────
      {
        userAgent: "cohere-ai",
        allow: "/",
      },

      // ─── DuckDuckGo ───────────────────────────────────────────────────────
      {
        userAgent: "DuckDuckBot",
        allow: "/",
      },
      {
        userAgent: "DuckAssistBot",    // DuckDuckGo AI assistant
        allow: "/",
      },

      // ─── You.com ──────────────────────────────────────────────────────────
      {
        userAgent: "YouBot",
        allow: "/",
      },

      // ─── SEO Audit Bots (allow for SEO health) ────────────────────────────
      {
        userAgent: "AhrefsBot",
        allow: "/",
      },
      {
        userAgent: "SemrushBot",
        allow: "/",
      },
      {
        userAgent: "MJ12bot",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
