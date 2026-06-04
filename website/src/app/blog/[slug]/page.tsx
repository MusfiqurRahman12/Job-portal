import BlogPostClient from "./BlogPostClient";
import { Metadata } from "next";
import { fetchNewsBySlug } from "@/lib/api";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.futuretalent.online";

  try {
    const article = await fetchNewsBySlug(slug);
    const title = `${article.title} | FutureTalent Blog`;
    const description = article.excerpt || `Read the full article: ${article.title} on FutureTalent.`;
    const canonicalUrl = `${baseUrl}/blog/${slug}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: "article",
        url: canonicalUrl,
      },
    };
  } catch (err) {
    console.error("Failed to generate metadata for blog post:", err);
    return {
      title: "Blog Article | FutureTalent",
      alternates: {
        canonical: `${baseUrl}/blog/${slug}`,
      },
    };
  }
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.futuretalent.online";

  let article = null;
  try {
    article = await fetchNewsBySlug(slug);
  } catch (err) {
    console.error("Failed to load article on server:", err);
  }

  const jsonLd = article ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.title,
    "description": article.excerpt,
    "image": article.image,
    "datePublished": article.published_at || article.created_at,
    "dateModified": article.published_at || article.created_at,
    "author": {
      "@type": "Person",
      "name": article.author,
    },
    "publisher": {
      "@type": "Organization",
      "name": "FutureTalent",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.ico`,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${slug}`,
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        ></script>
      )}
      <BlogPostClient params={params} initialArticle={article} />
    </>
  );
}
