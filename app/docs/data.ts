export interface DocCategory {
  title: string;
  icon: string;
  description: string;
  content: string;
}

export const docCategories: DocCategory[] = [
  {
    title: "Getting Started",
    icon: "🚀",
    description: "Welcome to CryptoViz! Learn the basics of the visualization platform.",
    content: "CryptoViz is an interactive, real-time cryptocurrency data visualization platform. It is designed to help users demystify complex cryptographic algorithms and track core market configurations visually and cleanly."
  },
  {
    title: "Installation & Setup",
    icon: "💻",
    description: "Step-by-step guide to clone, install dependencies, and run CryptoViz locally.",
    content: "1. Clone the repository:\ngit clone https://github.com/csxark/CryptoViz.git\n2. Install project packages:\nnpm install\n3. Fire up the development environment local server:\nnpm run dev"
  },
  {
    title: "Features Overview",
    icon: "📊",
    description: "Explore the live tracking interfaces, cipher simulators, and visual grids.",
    content: "• Asymmetric & Symmetric algorithm playgrounds\n• Dynamic cipher engines with step-by-step step animations\n• High-performance interactive data visualizations\n• Clean dark-mode oriented color contrasts"
  },
  {
    title: "Project Architecture",
    icon: "🏗️",
    description: "Understand the folder structure, worker mechanics, and components layout.",
    content: "Built on Next.js, React, and Tailwind CSS. Heavy cryptographic calculations are shifted off the main thread using dedicated Web Workers (`cipher.worker.ts`) to maintain seamless animations."
  },
  {
    title: "Contribution Guide",
    icon: "🤝",
    description: "Want to contribute? Guidelines for submitting pull requests and handling code styling.",
    content: "We welcome all contributors! Fork the repository, create an isolated descriptive feature branch, ensure testing via vitest matches standards, and submit your PR for review."
  },
  {
    title: "Troubleshooting & FAQs",
    icon: "🛠️",
    description: "Solutions to common setup bugs and technical rendering questions.",
    content: "Encountering dependency resolution discrepancies? Run `npm clean-install` to wipe standard configurations and re-sync local nodes. Ensure your node engine targets versions matching modern Next.js structures."
  }
];