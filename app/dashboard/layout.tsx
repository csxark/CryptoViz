import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: "Learning Progress Dashboard | CryptoViz",
  description: "Track your cryptography curriculum progress, challenge accuracy, active streaks, and bookmarked algorithm visualizers.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
