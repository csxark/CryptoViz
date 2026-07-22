"use client";

interface Props {
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  difficulty: string;
  setDifficulty: (value: string) => void;
}

const categories = [
  "All",
  "Book",
  "Research Paper",
  "RFC",
  "NIST",
  "Video",
  "Website",
];

const difficulties = [
  "All",
  "Beginner",
  "Intermediate",
  "Advanced",
];

export default function ResourceFilters({
  search,
  setSearch,
  category,
  setCategory,
  difficulty,
  setDifficulty,
}: Props) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <label htmlFor="resource-search" className="sr-only">Search resources</label>
      <input
  id="resource-search"
  type="text"
  placeholder="Search resources..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="w-full flex-1 rounded-xl border border-[#2A2A31] bg-[#101013] px-4 py-3 text-sm text-[#F5F5F5] placeholder:text-[#64646F] outline-none transition focus:border-[#00C2AE] focus:ring-1 focus:ring-[#00C2AE]"
/>

      <label htmlFor="category-select" className="sr-only">Filter by category</label>
      <select
        id="category-select"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="min-w-[150px] rounded-xl border border-[#2A2A31] bg-[#101013] px-4 py-3 text-sm text-[#F5F5F5] transition outline-none focus:border-[#00C2AE] focus:ring-1 focus:ring-[#00C2AE]"
        aria-label="Filter by category"
      >
        {categories.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>

      <label htmlFor="difficulty-select" className="sr-only">Filter by difficulty</label>
      <select
        id="difficulty-select"
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        className="min-w-[150px] rounded-xl border border-[#2A2A31] bg-[#101013] px-4 py-3 text-sm text-[#F5F5F5] transition outline-none focus:border-[#00C2AE] focus:ring-1 focus:ring-[#00C2AE]"
        aria-label="Filter by difficulty"
      >
        {difficulties.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}