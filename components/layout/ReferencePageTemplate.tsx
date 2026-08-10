import type { ReactNode } from "react";
import PageTemplate from "./PageTemplate";
import type { BreadcrumbItem } from "./Breadcrumbs";

interface ReferencePageTemplateProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export default function ReferencePageTemplate({
  title,
  description,
  eyebrow = "Reference",
  breadcrumbs = [],
  children,
  className = "",
  hideHeader = false,
}: ReferencePageTemplateProps) {
  return (
    <PageTemplate
      category="reference"
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