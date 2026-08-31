import type { Metadata } from "next";
import RsaAttackPlayground from "../../../components/attacks/RsaAttackPlayground";

export const metadata: Metadata = {
  title: "RSA Attack Playground | CryptoViz",
  description: "Educational RSA attack playground demonstrating Fermat factorization for close primes, Wiener's small private exponent attack, and common modulus vulnerabilities.",
};

export default function RsaAttackPlaygroundPage() {
  return <RsaAttackPlayground />;
}
