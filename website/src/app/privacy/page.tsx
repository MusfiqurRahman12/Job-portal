import PrivacyClient from "./PrivacyClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | FutureTalent",
  description: "Learn how FutureTalent collects, uses, and protects your personal data. Read our privacy policy and cookie policy.",
  alternates: {
    canonical: "https://www.futuretalent.online/privacy",
  },
};

export default function Page() {
  return <PrivacyClient />;
}
