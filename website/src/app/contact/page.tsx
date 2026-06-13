import ContactClient from "./ContactClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Get in Touch with FutureTalent",
  description:
    "Have questions about FutureTalent? Want to report a job listing, request a feature, or partner with us? Reach out and we'll get back to you within 24 hours.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Us — Get in Touch with FutureTalent",
    description:
      "Have a question or want to partner with FutureTalent? Send us a message and we'll respond within 24 hours.",
    type: "website",
  },
};

export default function Page() {
  return <ContactClient />;
}
