import type { Metadata } from "next";
import MorseCodeVisualizer from "../../components/encoding/MorseCodeVisualizer";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/footer";

export const metadata: Metadata = {
  title: "Morse Code Visualizer — Encoder/Decoder | CryptoViz",
  description:
    "Encode and decode Morse code with real-time signal waveform visualization. Learn ITU International Morse Code with interactive timing analysis.",
};

export default function MorseCodePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <MorseCodeVisualizer />
      </main>
      <Footer />
    </div>
  );
}
