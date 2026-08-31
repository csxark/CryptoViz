import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: "Offline Sandbox Access Mode | CryptoViz",
  description: "Access local Web Crypto API implementations, cached laboratory challenges, and structural visualizer modules without an active network connection.",
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
