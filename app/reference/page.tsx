"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import ReferencePageTemplate from "@/components/layout/ReferencePageTemplate";

import GlobalSearch from "@/components/search/GlobalSearch";
const sections = [
  {
    title: "Documentation",
    href: "/docs",
    badge: "DOCS",
    description:
      "Learn cryptographic concepts, architectures, implementation guides and educational documentation.",
    related: [
      { name: "Glossary", href: "/glossary" },
      { name: "Standards & RFCs", href: "/resources/standards-rfc" },
      { name: "Video Library", href: "/resources/video-library" },
    ],
  },
  {
    title: "Glossary",
    href: "/glossary",
    badge: "REFERENCE",
    description:
      "Explore cryptography terminology and definitions with cross-linked concepts.",
    related: [
      { name: "Documentation", href: "/docs" },
      { name: "Resources", href: "/resources" },
    ],
  },
  {
    title: "Learning Resources",
    href: "/resources",
    badge: "LIBRARY",
    description:
      "Browse books, papers, repositories, learning websites and curated resources.",
    related: [
      { name: "Standards & RFCs", href: "/resources/standards-rfc" },
      { name: "Video Library", href: "/resources/video-library" },
    ],
  },
  {
    title: "Standards & RFCs",
    href: "/resources/standards-rfc",
    badge: "STANDARDS",
    description:
      "Browse RFCs, FIPS publications and NIST cryptographic standards.",
    related: [
      { name: "Documentation", href: "/docs" },
      { name: "Resources", href: "/resources" },
    ],
  },
  {
    title: "Case Studies",
    href: "/case-studies",
    badge: "CASE STUDIES",
    description:
      "Learn from real-world cryptographic failures and security success stories.",
    related: [
      { name: "Documentation", href: "/docs" },
      { name: "Glossary", href: "/glossary" },
    ],
  },
  {
    title: "Video Library",
    href: "/resources/video-library",
    badge: "VIDEOS",
    description:
      "Watch curated cryptography lectures, conference talks and educational videos.",
    related: [
      { name: "Resources", href: "/resources" },
      { name: "Documentation", href: "/docs" },
    ],
  },
];

export default function ReferenceHubPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-[#081419] dark:via-[#09090B] dark:to-[#120d1d]">
      <Navbar />

        <ReferencePageTemplate
        title="Reference Hub"
        description="Access all CryptoViz learning material from one place. Browse documentation, glossary terms, resources, standards, case studies and videos while keeping the existing learning routes intact."
        eyebrow="Unified Knowledge Hub"
        breadcrumbs={[
          { label: "Reference" },
          { label: "Reference Hub" },
        ]}
      >
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#16161A] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#00C2AE]"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-[#00C2AE]">
                {section.badge}
              </span>

              <h2 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                {section.title}
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-[#B3B3B8]">
                {section.description}
              </p>

              <Link
                href={section.href}
                className="mt-6 inline-flex items-center rounded-xl bg-[#00C2AE] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00a896]"
              >
                Explore →
              </Link>

              <div className="mt-8 border-t border-zinc-200 dark:border-[#2A2A31] pt-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-white">
                  Related Resources
                </h3>

                <div className="flex flex-wrap gap-2">
                  {section.related.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="rounded-lg bg-zinc-100 dark:bg-[#101013] px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 transition hover:bg-[#00C2AE] hover:text-white"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ReferencePageTemplate>
    </div>
  );
}