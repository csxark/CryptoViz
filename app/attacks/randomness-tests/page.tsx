import RandomnessTestSuite from "@/components/attacks/RandomnessTestSuite";

export const metadata = {
  title: "Randomness Quality Test Suite (NIST SP 800-22) — CryptoViz",
  description:
    "Run a NIST SP 800-22 battery — monobit, block frequency, runs, longest run, serial and byte uniformity — over crypto.getRandomValues, Math.random and a weak LCG, and see why passing is not the same as being secure.",
};

export default function RandomnessTestsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        Randomness Quality Test Suite
      </h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        Randomness is load-bearing for almost everything on this site — IVs and nonces in the Modes
        Lab, the one-time pad, RSA and Diffie-Hellman key generation, salts in the KDF visualizers.
        &ldquo;Never use <code className="font-mono text-sm">Math.random</code> for
        cryptography&rdquo; is repeated everywhere, including here, but repeating a rule is not the
        same as showing it. This runs a NIST SP 800-22 battery over several generators so you can
        check it.
      </p>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        The result is more interesting than the slogan. <code className="font-mono text-sm">Math.random</code>{" "}
        will probably <em>pass</em> — it is a decent statistical generator, and what disqualifies it
        is predictability, not bias. A 1960s LCG, by contrast, looks fine to a bit-counting test and
        falls apart the moment you plot consecutive outputs against each other.
      </p>
      <RandomnessTestSuite />
    </main>
  );
}
