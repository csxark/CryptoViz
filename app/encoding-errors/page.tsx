'use client';

import React from 'react';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import LearnPageTemplate from "@/components/layout/LearnPageTemplate";
import EncodingErrorPlayground from '@/components/encoding/EncodingErrorPlayground';
import { Bug } from 'lucide-react';

export default function EncodingErrorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />

        <LearnPageTemplate
        title="Encoding Error & Mojibake Playground"
        description="Explore how decoders handle invalid sequences, byte-level truncation, Base64 padding corruption, and Mojibake character set mismatches."
        eyebrow="ENCODING ERROR PLAYGROUND #506"
        breadcrumbs={[
          { label: 'Learn' },
          { label: 'Encoding Errors' },
        ]}
      >
        <EncodingErrorPlayground />

        {/* Educational Reference Cards */}
        <section
          aria-labelledby="encoding-pitfalls-heading"
          className="space-y-6"
        >
          <div>
            <h2
              id="encoding-pitfalls-heading"
              className="text-2xl font-bold text-zinc-900 dark:text-white"
            >
              Common Encoding Pitfalls & Explanations
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Key concepts in string encoding, byte offsets, and decoding
              errors.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Base64 */}
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-500">
                Base64 Padding
              </span>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Padding '=' Symbol Failures
              </h3>

              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Base64 processes data in 3-byte (24-bit) blocks. When input
                length is not a multiple of 3 bytes, trailing '=' characters
                pad the remaining 6-bit units. Omission or misplaced '=' causes
                decoder exceptions.
              </p>
            </div>

            {/* UTF-8 */}
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-500">
                UTF-8 Truncation
              </span>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Replacement Character (�)
              </h3>

              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                UTF-8 uses variable-length encoding (1 to 4 bytes per
                codepoint). If a multi-byte sequence is truncated mid-stream,
                standard decoders emit the Unicode replacement character �
                (U+FFFD).
              </p>
            </div>

            {/* Mojibake */}
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-500">
                Mojibake
              </span>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Character Set Misinterpretation
              </h3>

              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Mojibake occurs when text written in one encoding (e.g. UTF-8)
                is decoded using a different character set (e.g. ISO-8859-1),
                displaying garbled symbols such as "Ã©" instead of "é".
              </p>
            </div>
          </div>
        </section>
      </LearnPageTemplate>

      <Footer />
    </div>
  );
}
