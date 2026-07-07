import Link from "next/link";

const learnLinks = [
  { name: "Classical Ciphers", href: "/visualizer" },
  { name: "Symmetric Cryptosystems", href: "/visualizer" },
  { name: "Secure Hash Functions", href: "/visualizer" },
  { name: "Asymmetric Cryptography", href: "/visualizer" },
];

const projectLinks = [
  {
    name: "Contributing",
    href: "https://github.com/csxark/CryptoViz/blob/main/CONTRIBUTING.md",
  },
  {
    name: "Guidelines",
    href: "https://github.com/csxark/CryptoViz/blob/main/GUIDELINES.md",
  },
];

const resourceLinks = [
  {
    name: "GitHub Repository",
    href: "https://github.com/csxark/CryptoViz",
  },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={
                link.href.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              className="text-sm text-zinc-600 transition-colors hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400"
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
    <footer className="border-t border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <svg
                className="h-6 w-6 text-teal-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="text-base font-bold text-zinc-900 dark:text-white">
                Crypto<span className="text-teal-500">Viz</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              An open-source, interactive platform for learning cryptography
              through visualization.
            </p>
          </div>

          <FooterColumn title="Learn" links={learnLinks} />
          <FooterColumn title="Project" links={projectLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:flex-row">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} CryptoViz. Released under the MIT
            License.
          </p>

          <Link
            href="https://github.com/csxark/CryptoViz"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-teal-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-teal-400"
            aria-label="GitHub Repository"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 008 10.94c.58.1.79-.25.79-.56v-2.17c-3.25.71-3.94-1.39-3.94-1.39-.53-1.35-1.3-1.7-1.3-1.7-1.07-.73.08-.72.08-.72 1.18.08 1.8 1.21 1.8 1.21 1.05 1.8 2.75 1.28 3.42.98.11-.76.41-1.28.74-1.57-2.6-.3-5.34-1.3-5.34-5.8 0-1.28.46-2.33 1.2-3.15-.12-.3-.52-1.52.11-3.17 0 0 .98-.31 3.2 1.2a11.1 11.1 0 015.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.65.23 2.87.11 3.17.75.82 1.2 1.87 1.2 3.15 0 4.51-2.74 5.49-5.35 5.79.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  );
}