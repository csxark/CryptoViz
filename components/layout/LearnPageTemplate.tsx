import type { ReactNode } from "react";
import PageTemplate from "./PageTemplate";
import type { BreadcrumbItem } from "./Breadcrumbs";

interface LearnPageTemplateProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export default function LearnPageTemplate({
  title,
  description,
  eyebrow = "Learning workspace",
  breadcrumbs = [],
  children,
  className = "",
  hideHeader = false,
}: LearnPageTemplateProps) {
  return (
    <PageTemplate
      category="learn"
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