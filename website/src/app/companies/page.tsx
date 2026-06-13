import { Metadata } from "next";
import { fetchCompanyProfiles } from "@/lib/api";
import CompaniesClient from "./CompaniesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top Global & Remote Companies Hiring Now | FutureTalent",
  description:
    "Explore top companies hiring remote, hybrid, and on-site workers worldwide. Use our interactive 3D globe to discover open job postings by brand and location.",
  alternates: {
    canonical: "/companies",
  },
  openGraph: {
    title: "Top Global & Remote Companies Hiring Now | FutureTalent",
    description:
      "Discover active opportunities by company using our interactive 3D globe and browse remote-friendly employers.",
    type: "website",
  },
};

export default async function Page() {
  const companies = await fetchCompanyProfiles();

  return (
    <>
      {/* ── Breadcrumb JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://www.futuretalent.online",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Companies",
                item: "https://www.futuretalent.online/companies",
              },
            ],
          }),
        }}
      />
      <CompaniesClient companies={companies} />
    </>
  );
}
