import HomeClient from "./HomeClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://www.futuretalent.online",
  },
};

export default function Page() {
  return <HomeClient />;
}
