import VigenereCryptanalysisSimulator from "@/components/attacks/VigenereCryptanalysisSimulator";

export const metadata = {
  title: "Vigenère Cryptanalysis Workbench — Kasiski, IoC & Column Solving — CryptoViz",
  description:
    "Break a Vigenère cipher from ciphertext alone: recover the key length with Kasiski examination and the Index of Coincidence, then solve each column as an independent Caesar cipher.",
};

export default function VigenereCryptanalysisPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        Vigenère Cryptanalysis Workbench
      </h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        Frequency analysis breaks Caesar in one pass because a monoalphabetic cipher relabels the
        letter histogram without reshaping it. Vigenère defeats that attack by shifting each letter
        by a different amount, flattening the histogram toward uniform — which is why it was called{" "}
        <em>le chiffre indéchiffrable</em> for three hundred years. The break, found by Babbage and
        published by Kasiski in 1863, is indirect: recover the key <strong>length</strong> from
        repeated ciphertext fragments and the Index of Coincidence, and the cipher decomposes into a
        stack of independent Caesar ciphers that frequency analysis dispatches one at a time.
      </p>
      <VigenereCryptanalysisSimulator />
    </main>
  );
}
