import type { Metadata } from "next";
import DesKeyScheduleVisualizer from "../../../components/symmetric/DesKeyScheduleVisualizer";

export const metadata: Metadata = {
  title: "DES Key Schedule Visualizer | CryptoViz",
  description:
    "Interactive DES key schedule visualizer showing PC-1, C/D halves, left shifts, PC-2, and 16 round subkeys.",
};

export default function DesKeyScheduleVisualizerPage() {
  return <DesKeyScheduleVisualizer />;
}
