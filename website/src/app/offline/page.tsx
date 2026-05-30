import OfflineClient from "./OfflineClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline | FutureTalent",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <OfflineClient />;
}
