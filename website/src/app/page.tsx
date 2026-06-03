import HomeClient from "./HomeClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FutureTalent | Find Remote, Hybrid & On-Site Jobs Worldwide",
  description: "Discover active remote, hybrid, and on-site job listings from over 200 sources worldwide. Updated daily. Find your dream career today with FutureTalent.",
  alternates: {
    canonical: "https://www.futuretalent.online",
  },
};

export default function Page() {
  return <HomeClient />;
}
