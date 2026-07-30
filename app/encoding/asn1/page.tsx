import Asn1Decoder from "@/components/encoding/Asn1Decoder";

export const metadata = {
  title: "ASN.1 / DER Structure Decoder — PEM, TLV Tree & OIDs — CryptoViz",
  description:
    "Decode a PEM certificate or raw DER into its Tag-Length-Value tree, resolve algorithm OIDs, and see exactly which bytes each element occupies — with DER-strictness violations flagged.",
};

export default function Asn1DecoderPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        ASN.1 / DER Structure Decoder
      </h1>
      <p className="mb-6 max-w-3xl text-slate-600 dark:text-zinc-400">
        Every asymmetric algorithm on this site — RSA, ECDSA, Ed25519, X25519, ML-KEM, ML-DSA —
        travels the real world wrapped in ASN.1 DER and Base64-armoured into PEM. The visualizers
        cover the mathematics; this covers the envelope. DER is nothing but{" "}
        <strong>Tag, Length, Value</strong>, nested — plus the &ldquo;distinguished&rdquo;
        constraints that make the encoding canonical: definite lengths only, shortest-form lengths,
        minimally-padded integers, sorted sets. Violations are reported as notes rather than fatal
        errors, so you can see exactly <em>why</em> a blob is BER but not DER.
      </p>
      <Asn1Decoder />
    </main>
  );
}
