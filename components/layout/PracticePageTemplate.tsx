import type { ReactNode } from "react";
import PageTemplate from "./PageTemplate";
import type { BreadcrumbItem } from "./Breadcrumbs";

interface PracticePageTemplateProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export default function PracticePageTemplate({
  title,
  description,
  eyebrow = "Practice workspace",
  breadcrumbs = [],
  children,
  className = "",
  hideHeader = false,
}: PracticePageTemplateProps) {
  return (
    <PageTemplate
      category="practice"
      title={title}
      description={description}
      eyebrow={eyebrow}
      breadcrumbs={breadcrumbs}
      className={className}
      hideHeader={hideHeader}
    >
      {children}
    </PageTemplate>
  );
}