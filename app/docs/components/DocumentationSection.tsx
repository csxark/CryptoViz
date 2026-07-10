import React from 'react';

interface DocumentationSectionProps {
  title: string;
  children: React.ReactNode;
}

export const DocumentationSection: React.FC<DocumentationSectionProps> = ({ title, children }) => {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-xl font-mono font-bold text-zinc-900 dark:text-white tracking-tight mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
};
