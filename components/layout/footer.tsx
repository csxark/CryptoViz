import Link from "next/link";
import { MessagesSquare } from "lucide-react";

const learnLinks = [
  { name: "Classical Ciphers", href: "/visualizer" },
  { name: "Symmetric Cryptosystems", href: "/visualizer" },
  { name: "Secure Hash Functions", href: "/visualizer" },
  { name: "Asymmetric Cryptography", href: "/visualizer" },
];

const projectLinks = [
  { name: "Documentation", href: "/docs" },
  { name: "API Reference", href: "/docs/api" },
  { name: "Roadmap", href: "https://github.com/csxark/CryptoViz/issues" },
];

const resourceLinks = [
  { name: "Resources", href: "/resources" },
  { name: "Blog", href: "/blog" },
  { name: "GitHub Repository", href: "https://github.com/csxark/CryptoViz" },
  { name: "Contribution Guide", href: "https://github.com/csxark/CryptoViz/blob/main/CONTRIBUTING.md" },
  { name: "Discord", href: "#" },
];

function FooterColumn({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-[#F5F5F5]">
        {title}
      </h3>
      <ul className="mt-4 space-y-3" aria-label={`${title} links`}>
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="inline-block text-sm text-zinc-500 dark:text-[#8A8A94] transition-all duration-200 hover:translate-x-1 hover:text-teal-600 dark:hover:text-[#00C2AE]"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200/50 dark:border-[#2A2A31]/50 bg-zinc-100/80 dark:bg-black/40 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <svg
                className="h-7 w-7 text-teal-600 dark:text-[#00C2AE]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="text-xl font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Crypto<span className="text-teal-600 dark:text-[#00C2AE]">Viz</span>
              </span>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-[#8A8A94]">
              An open-source, interactive platform for learning cryptography through modern visualization and experimentation.
            </p>
            <div className="mt-8">
              <Link
                href="https://github.com/csxark/CryptoViz/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5] shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:border-teal-500/50 dark:hover:border-[#008A7C]/50 hover:bg-zinc-50 dark:hover:bg-[#16161A] hover:text-teal-600 dark:hover:text-[#00C2AE]"
              >
                Become a Contributor
              </Link>
            </div>
          </div>

          <FooterColumn title="Learn" links={learnLinks} />
          <FooterColumn title="Project" links={projectLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-zinc-200 dark:border-[#2A2A31] pt-8 md:flex-row">
          <p className="text-sm text-zinc-500 dark:text-[#8A8A94]">
            © {new Date().getFullYear()} CryptoViz. Released under the MIT License.
          </p>

          <div className="flex space-x-4">
            <Link
              href="https://github.com/csxark/CryptoViz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 dark:text-[#8A8A94] transition-all duration-200 hover:text-teal-600 dark:hover:text-[#00C2AE] hover:-translate-y-1"
              aria-label="GitHub Repository"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 dark:text-[#8A8A94] transition-all duration-200 hover:text-teal-600 dark:hover:text-[#00C2AE] hover:-translate-y-1"
              aria-label="Discord Server"
            >
              <MessagesSquare size={20} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}