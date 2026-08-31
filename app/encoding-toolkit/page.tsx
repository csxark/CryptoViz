import type { Metadata } from "next";
import EncodingToolkit from "../../components/encoding/EncodingToolkit";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/footer";

export const metadata: Metadata = {
  title: "Base Encoding Toolkit — Multi-Format Converter | CryptoViz",
  description:
    "Encode and decode between Base64, Base32, Hex, Binary, URL encoding, ASCII, ROT13, and Decimal with step-by-step visualization.",
};

export default function EncodingToolkitPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <EncodingToolkit />
      </main>
      <Footer />
    </div>
  );
}
