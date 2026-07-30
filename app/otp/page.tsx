import TotpVisualizer from "@/components/otp/TotpVisualizer";

export const metadata = {
  title: "TOTP / HOTP Authenticator Visualizer (RFC 4226 & RFC 6238) — CryptoViz",
  description:
    "Watch a 6-digit authenticator code being derived: Base32 secret, time step, HMAC, dynamic truncation and the modulo — plus a clock-skew explorer and a server-side verifier.",
};

export default function OtpPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        TOTP / HOTP Authenticator Visualizer
      </h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        The 6-digit code in Google Authenticator is the piece of cryptography most people touch
        every day, and it is built entirely from primitives this site already covers. HOTP
        (RFC 4226) is HMAC over a counter, squeezed into six digits by a step called{" "}
        <strong>dynamic truncation</strong>. TOTP (RFC 6238) replaces the counter with{" "}
        <code className="font-mono text-sm">floor(unixTime / 30)</code>, which removes the
        counter-drift problem and introduces a clock-drift problem in its place — which is exactly
        why servers accept a small window of adjacent time steps.
      </p>
      <TotpVisualizer />
    </main>
  );
}
