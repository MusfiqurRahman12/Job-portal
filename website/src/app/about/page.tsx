import AboutClient from "./AboutClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About FutureTalent — Our Mission to Connect Talent Worldwide",
  description:
    "FutureTalent is an AI-powered job aggregator that curates remote, hybrid, and on-site opportunities from 200+ sources daily. Learn about our mission, how we work, and the team behind the platform.",
  alternates: {
    canonical: "https://www.futuretalent.online/about",
  },
  openGraph: {
    title: "About FutureTalent — Our Mission to Connect Talent Worldwide",
    description:
      "Learn how FutureTalent uses AI to curate the best job opportunities from 200+ sources worldwide, updated every 24 hours.",
    type: "website",
  },
};

export default function Page() {
  return <AboutClient />;
}
