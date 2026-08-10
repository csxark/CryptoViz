import type { ReactNode } from "react";
import Breadcrumbs, { BreadcrumbItem } from "./Breadcrumbs";

type PageCategory = "learn" | "practice" | "reference";

interface PageTemplateProps {
  category: PageCategory;
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  hideHeader?: boolean;
}

const categoryStyles: Record<
  PageCategory,
  {
    eyebrow: string;
    accent: string;
  }
> = {
  learn: {
    eyebrow: "text-teal-600 dark:text-teal-400",
    accent: "border-teal-500/20",
  },
  practice: {
    eyebrow: "text-teal-600 dark:text-teal-400",
    accent: "border-teal-500/20",
  },
  reference: {
    eyebrow: "text-teal-600 dark:text-teal-400",
    accent: "border-teal-500/20",
  },
};

export default function PageTemplate({
  category,
  title,
  description,
  eyebrow,
  breadcrumbs = [],
  children,
  className = "",
  contentClassName = "",
  hideHeader = false,
}: PageTemplateProps) {
  const styles = categoryStyles[category];

  return (
    <main
      className={`mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8 ${className}`.trim()}
    >
      {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

{!hideHeader && (
      <header className={`max-w-3xl ${contentClassName}`.trim()}>
        {eyebrow && (
          <p
            className={`text-xs font-bold uppercase tracking-[0.2em] ${styles.eyebrow}`}
          >
            {eyebrow}
          </p>
        )}

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
          {title}
        </h1>

        {description && (
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
      </header>
)}

      {children}
    </main>
  );
}