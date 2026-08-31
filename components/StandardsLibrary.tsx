"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { standards } from "@/lib/standards";

export default function StandardsLibrary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = [
    "All",
    ...new Set(standards.map((s) => s.category)),
  ];

  const filtered = useMemo(() => {
    return standards.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.organization.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  return (
    <div className="space-y-6">

      <div className="grid md:grid-cols-2 gap-4">

        <input
          id="standards-search-input"
          type="text"
          placeholder="Search standards (e.g. FIPS 197, RFC 8446)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search cryptographic standards and RFCs"
          className="border rounded-lg px-4 py-2 w-full dark:bg-zinc-900"
        />
        <Link href="/docs/nist-rfc-standards-library">
  Read Documentation
</Link>

        <select
          id="standards-category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter standards by category"
          className="border rounded-lg px-4 py-2 dark:bg-zinc-900"
        >
          {categories.map((cat) => (
            <option key={cat}>
              {cat}
            </option>
          ))}
        </select>

      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {filtered.map((item) => (

          <div
            key={item.id}
            className="border rounded-xl shadow-sm p-5 bg-white dark:bg-zinc-900"
          >
            <div className="flex justify-between mb-3">
              <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {item.organization}
              </span>

              <span className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                {item.category}
              </span>
            </div>

            <h3 className="text-xl font-bold mb-2">
              {item.title}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {item.description}
            </p>

          <div className="mt-4 flex gap-4">
  <a
    href={item.reference}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 font-semibold hover:underline"
  >
    Official Standard →
  </a>

<Link href="/docs/standards" className="text-teal-600 font-semibold hover:underline dark:text-teal-400">
  Explore Specifications →
</Link></div>
          </div>

        ))}

      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
          <SearchX className="h-10 w-10 text-zinc-400 mb-3" aria-hidden="true" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No cryptographic standards found</h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            No standards match your current search query or category filter.
          </p>
          <button
            type="button"
            onClick={() => { setSearch(""); setCategory("All"); }}
            className="mt-4 inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
          >
            Reset Search Filters
          </button>
        </div>
      )}

    </div>
  );
}