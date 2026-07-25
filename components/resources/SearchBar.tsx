"use client";

import { LearningResource } from "@/lib/resources";
import ResourceCard from "./ResourceCard";

interface Props {
  resources: LearningResource[];
  onClear?: () => void;
}

export default function SearchBar({ resources, onClear }: Props) {
  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-[#2A2A31] bg-[#16161A] p-12 text-center">
        <svg
          className="mx-auto h-10 w-10 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">No resources found</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Try changing your search or filters.
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
        />
      ))}
    </div>
  );
}