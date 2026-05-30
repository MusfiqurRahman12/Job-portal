import BlogClient from "./BlogClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Remote Pulse — Career Blog | FutureTalent",
  description: "Explore the latest insights, career strategies, and remote work trends. Stay ahead with FutureTalent's curated resources.",
  alternates: {
    canonical: "https://www.futuretalent.online/blog",
  },
};

export default function Page() {
  return <BlogClient />;
}
