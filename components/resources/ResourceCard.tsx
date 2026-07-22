"use client";

import { ExternalLink } from "lucide-react";
import { LearningResource } from "@/lib/resources";

interface Props {
  resource: LearningResource;
}



export default function ResourceCard({ resource }: Props) {
  return (
    <div className="group flex h-full flex-col justify-between rounded-2xl border border-[#2A2A31] bg-[#16161A] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-[#00C2AE]/70">
      <div>
        <div className="mb-5 flex items-center justify-between">
          <span className="rounded-md border border-[#2A2A31] bg-[#101013] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8A8A94]">
            {resource.category}
          </span>

          <span className="text-xs text-[#8A8A94]">
            {resource.difficulty}
          </span>
        </div>

        <h2 className="text-2xl font-semibold leading-tight text-zinc-100 transition-colors group-hover:text-[#00C2AE]">
          {resource.title}
        </h2>

        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#64646F]">
          {resource.author}
        </p>

        <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#B3B3B8]">
          {resource.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-[#2A2A31] bg-[#101013] px-2 py-0.5 text-[11px] text-[#8A8A94]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-7 border-t border-[#2A2A31]" />
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2A2A31] bg-transparent px-4 py-3 text-sm font-medium text-[#00C2AE] transition hover:border-[#00C2AE] hover:bg-[#0C3634]/30"
        aria-label={`Open resource: ${resource.title}`}
        >
        Open Resource
        <ExternalLink size={16} />
      </a>
    </div>
  );
}