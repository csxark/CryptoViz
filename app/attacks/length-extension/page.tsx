import LengthExtensionSimulator from "@/components/attacks/LengthExtensionSimulator";

export const metadata = {
  title: "SHA-256 Length Extension Attack Simulator — CryptoViz",
  description:
    "Watch a length-extension attack forge a valid H(secret || message || extra) MAC without ever learning the secret, exploiting the Merkle–Damgård structure of SHA-256.",
};

export default function LengthExtensionAttackPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        SHA-256 Length Extension Attack Simulator
      </h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        Any hash built on the Merkle–Damgård construction — SHA-256, SHA-512, MD5 — lets an attacker who knows{" "}
        <code>H(secret || message)</code> and the length of <code>message</code> compute{" "}
        <code>H(secret || message || glue_padding || extra)</code> without ever learning <code>secret</code>. This is
        why <code>H(secret || message)</code> is an unsafe MAC construction; HMAC exists specifically to fix it. Run
        the attack below against a simulated vulnerable server.
      </p>
      <LengthExtensionSimulator />
    </main>
  );
}
