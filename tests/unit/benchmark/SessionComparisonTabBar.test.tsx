import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SessionComparisonTabBar from "@/components/benchmark/SessionComparisonTabBar";

describe("SessionComparisonTabBar", () => {
  it("renders all navigation tabs with correct text", () => {
    render(<SessionComparisonTabBar activeTab="charts" onTabChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: /Comparison Charts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Algorithm Diff Grid/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Environmental Specs/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Educational Insights/i })).toBeInTheDocument();
  });

  it("sets aria-selected correctly based on activeTab prop", () => {
    const { rerender } = render(
      <SessionComparisonTabBar activeTab="charts" onTabChange={vi.fn()} />,
    );

    const chartsTab = screen.getByRole("tab", { name: /Comparison Charts/i });
    const tableTab = screen.getByRole("tab", { name: /Algorithm Diff Grid/i });

    expect(chartsTab).toHaveAttribute("aria-selected", "true");
    expect(tableTab).toHaveAttribute("aria-selected", "false");

    rerender(<SessionComparisonTabBar activeTab="table" onTabChange={vi.fn()} />);

    expect(chartsTab).toHaveAttribute("aria-selected", "false");
    expect(tableTab).toHaveAttribute("aria-selected", "true");
  });

  it("calls onTabChange with corresponding tab ID when clicked", () => {
    const onTabChange = vi.fn();
    render(<SessionComparisonTabBar activeTab="charts" onTabChange={onTabChange} />);

    const envTab = screen.getByRole("tab", { name: /Environmental Specs/i });
    fireEvent.click(envTab);

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith("environment");
  });
});
