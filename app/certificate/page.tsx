"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui";

export default function CertificatePage() {
  const [name, setName] = useState("");
  const [issued, setIssued] = useState(false);

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) setIssued(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center p-[var(--space-4)] bg-[var(--color-bg-base)]">
      {!issued ? (
        <Card variant="elevated" padding="lg" className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Claim Your Certificate</CardTitle>
            <CardDescription>
              Congratulations on completing the learning path! Please enter your name as you want it to appear on the certificate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIssue} className="flex flex-col gap-[var(--space-4)]">
              <Input 
                label="Full Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Satoshi Nakamoto" 
                required
              />
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Generate Certificate
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-[var(--space-6)] w-full">
          <div className="print:hidden w-full max-w-4xl flex justify-between items-center bg-[var(--color-bg-surface)] p-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
            <h1 className="text-[var(--text-lg)] font-bold text-[var(--color-text-primary)]">Your Certificate is Ready</h1>
            <Button onClick={handlePrint} variant="primary">
              Print / Save as PDF
            </Button>
          </div>
          <div className="w-full max-w-4xl aspect-[1.414] bg-[var(--color-bg-surface)] border-[12px] border-[var(--color-accent)] p-[var(--space-8)] relative flex flex-col items-center justify-center text-center print:border-[12px] print:border-[var(--color-accent)] print:w-[100vw] print:h-[100vh] shadow-[var(--shadow-lg)] rounded-none">
            <div className="absolute inset-4 border-2 border-dashed border-[var(--color-border-strong)] rounded-sm pointer-events-none"></div>
            <h2 className="text-[var(--text-4xl)] font-bold text-[var(--color-text-primary)] uppercase tracking-widest mb-[var(--space-2)] mt-8">Certificate of Completion</h2>
            <p className="text-[var(--text-lg)] text-[var(--color-text-secondary)] mb-[var(--space-8)]">This certifies that</p>
            <h3 className="text-5xl font-serif text-[var(--color-accent)] mb-[var(--space-8)] italic">{name}</h3>
            <p className="text-[var(--text-base)] text-[var(--color-text-secondary)] max-w-2xl leading-relaxed mb-[var(--space-8)]">
              Has successfully completed the comprehensive cryptography learning path on <strong>CryptoViz</strong>, demonstrating a strong understanding of ciphers, hashing, and modern cryptographic principles.
            </p>
            <div className="flex justify-between w-full max-w-2xl mt-auto pt-[var(--space-4)] border-t border-[var(--color-border)]">
              <div className="text-left">
                <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">Date</p>
                <p className="text-[var(--text-base)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">Issuer</p>
                <p className="text-[var(--text-base)] font-bold text-[var(--color-text-primary)]">CryptoViz Platform</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
