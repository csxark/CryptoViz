"use client";

import { useMemo, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import { resources } from "@/lib/resources";
import FilterBar from "@/components/resources/FilterBar";
import SearchBar from "@/components/resources/SearchBar";

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesSearch =
        resource.title.toLowerCase().includes(search.toLowerCase()) ||
        resource.description.toLowerCase().includes(search.toLowerCase()) ||
        resource.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase())
        );

      const matchesCategory =
        category === "All" || resource.category === category;

      const matchesDifficulty =
        difficulty === "All" || resource.difficulty === difficulty;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDifficulty
      );
    });
  }, [search, category, difficulty]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#081419] via-[#09090B] to-[#120d1d]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 border-b border-[#2A2A31] pb-10">

  <span className="inline-flex rounded-full border border-[#0C3634] bg-[#0C3634]/40 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#00C2AE]">
    RESOURCE LIBRARY
  </span>

  <h1 className="mt-5 text-5xl font-bold tracking-tight text-[#F5F5F5]">
    Learning Resources
  </h1>

  <p className="mt-4 max-w-3xl text-lg leading-8 text-[#B3B3B8]">
    Explore curated cryptography books, research papers, RFCs, NIST
    publications, videos, and practical learning resources to deepen
    your understanding of modern cryptography.
  </p>

</div>

        <div className="mb-10 rounded-2xl border border-[#2A2A31] bg-[#16161A] p-6">
  <FilterBar
    search={search}
    setSearch={setSearch}
    category={category}
    setCategory={setCategory}
    difficulty={difficulty}
    setDifficulty={setDifficulty}
  />
</div>

        <SearchBar
          resources={filteredResources}
          onClear={() => {
            setSearch("");
            setCategory("All");
            setDifficulty("All");
          }}
        />
      </main>
    </div>
  );
}