import TermsClient from "./TermsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | FutureTalent",
  description: "Read the Terms of Service for using the FutureTalent platform. Understand your rights and responsibilities when searching for jobs or posting listings.",
  alternates: {
    canonical: "https://www.futuretalent.online/terms",
  },
};

export default function Page() {
  return <TermsClient />;
}
