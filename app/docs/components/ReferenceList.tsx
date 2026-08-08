import React from 'react';

interface Reference {
  title: string;
  url: string;
}

interface ReferenceListProps {
  references: Reference[];
}

export const ReferenceList: React.FC<ReferenceListProps> = ({ references }) => {
  return (
    <ul className="space-y-2 mt-4">
      {references.map((ref) => (
        <li key={ref.url} className="flex items-start gap-2 text-sm font-sans">
          <span className="text-teal-600 dark:text-teal-400 mt-1 flex-shrink-0 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <a 
            href={ref.url} 
            target="_blank" 
            rel="noopener noreferrer"
className="inline-block text-zinc-600 dark:text-zinc-400 transition-all duration-200 hover:translate-x-0.5 hover:text-teal-600 dark:hover:text-teal-400 underline decoration-zinc-300 dark:decoration-zinc-700 hover:decoration-teal-500/50 underline-offset-4 break-words"          >
            {ref.title}
          </a>
        </li>
      ))}
    </ul>
  );
};
