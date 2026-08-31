import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: "Cryptographic Attack Simulators & Cryptanalysis Lab | CryptoViz",
  description: "Explore interactive, safe educational simulations of real-world cryptographic attacks including brute force, timing side-channels, padding oracles, and nonce reuse.",
};

export default function AttacksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
