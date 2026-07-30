import ECPointPlayground from "@/components/asymmetric/ECPointPlayground";

export const metadata = {
  title: "Elliptic Curve Point Arithmetic Playground — Group Law & ECDLP — CryptoViz",
  description:
    "Add and double points on a short Weierstrass curve over a small prime field, watch the double-and-add ladder, explore subgroup structure, and brute-force the discrete logarithm to see why real curves must be enormous.",
};

export default function ECPointArithmeticPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        Elliptic Curve Point Arithmetic Playground
      </h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        CryptoViz already visualizes ECDSA, ECIES, Ed25519, X25519 and Schnorr — but all of them
        show the <em>protocol</em> and delegate the curve arithmetic to a library. This is the layer
        underneath: what &ldquo;adding two points&rdquo; actually means.
      </p>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        The whole of ECC rests on one construction. Draw a line through two points on{' '}
        <code className="font-mono text-sm">y² = x³ + ax + b</code>, find where it meets the curve a
        third time, and reflect that point across the x-axis. That is the group law. Over a finite
        field the picture stops being geometric — the &ldquo;curve&rdquo; is a scatter of dots and a
        &ldquo;slope&rdquo; is a modular inverse — but the algebra survives intact, and everything
        else follows: the point at infinity as an identity, double-and-add, and a discrete logarithm
        problem nobody knows how to solve efficiently.
      </p>
      <ECPointPlayground />
    </main>
  );
}
