import type { Metadata } from "next";
import DocumentationPage from "./DocumentationPage";

export const metadata: Metadata = {
  title: "Documentation | CryptoViz",
  description:
    "CryptoViz documentation styled with the same design system as the main website, including responsive navigation and themed docs cards.",
};

export default function Page() {
  return <DocumentationPage />;
}
