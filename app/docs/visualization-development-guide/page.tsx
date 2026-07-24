import type { Metadata } from "next";
import VisualizationDevelopmentGuide from "../../../components/docs/VisualizationDevelopmentGuide";

export const metadata: Metadata = {
  title: "Visualization Development Guide | CryptoViz",
  description:
    "Interactive guide for building educational cryptography visualizations in CryptoViz.",
};

export default function VisualizationDevelopmentGuidePage() {
  return <VisualizationDevelopmentGuide />;
}
