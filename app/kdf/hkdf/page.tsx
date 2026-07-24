import HkdfVisualizer from "@/components/kdf/HkdfVisualizer";

export const metadata = {
  title: "HKDF Key Derivation Visualizer — CryptoViz",
  description:
    "Explore HMAC-based Extract-and-Expand Key Derivation Function (HKDF, RFC 5869). Visualize PRK extraction, block expansion, and output key material generation with live steps.",
};

export default function HkdfVisualizerPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        HKDF Key Derivation Visualizer (RFC 5869)
      </h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        HKDF is an HMAC-based Extract-and-Expand Key Derivation Function used extensively in modern security protocols like TLS 1.3, Signal, and Noise.
        This visualizer breaks down HKDF into its two fundamental phases: <strong>HKDF-Extract</strong> (converting input key material into a Pseudorandom Key PRK) and <strong>HKDF-Expand</strong> (expanding PRK with context info into subkeys).
      </p>
      <HkdfVisualizer />
    </main>
  );
}
