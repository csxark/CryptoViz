"use client";

import React from "react";
import { BarChart3, Layers, Sliders, HelpCircle } from "lucide-react";

export type ComparisonTabId = "charts" | "table" | "environment" | "educational";

export interface SessionComparisonTabBarProps {
  activeTab: ComparisonTabId;
  onTabChange: (tab: ComparisonTabId) => void;
}

const TABS: { id: ComparisonTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "charts", label: "Comparison Charts", icon: BarChart3 },
  { id: "table", label: "Algorithm Diff Grid", icon: Layers },
  { id: "environment", label: "Environmental Specs", icon: Sliders },
  { id: "educational", label: "Educational Insights", icon: HelpCircle },
];

export default function SessionComparisonTabBar({
  activeTab,
  onTabChange,
}: SessionComparisonTabBarProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-800 dark:text-teal-300"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
