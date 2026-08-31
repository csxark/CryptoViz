import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SessionComparisonVisualizer from "@/components/benchmark/SessionComparisonVisualizer";
import { DEFAULT_SESSION_PRESETS } from "@/lib/utils/comparison";

// Mock Recharts ResponsiveContainer to prevent width/height 0 in JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual<any>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

describe("SessionComparisonVisualizer", () => {
  const preset = DEFAULT_SESSION_PRESETS[0];

  it("renders feature title, metric cards, and default preset selector", () => {
    render(
      <SessionComparisonVisualizer
        sessionA={preset.sessionA}
        sessionB={preset.sessionB}
        sessionALabel="Test Session A"
        sessionBLabel="Test Session B"
      />,
    );

    expect(
      screen.getByText("Compare Benchmarks Across Sessions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Speedup Ratio (B / A)")).toBeInTheDocument();
    expect(screen.getByText("Mean Execution Time")).toBeInTheDocument();
    expect(screen.getByText("Worker RTT Delta")).toBeInTheDocument();
    expect(screen.getByText("Memory Growth Delta")).toBeInTheDocument();
  });

  it("switches tabs between charts, algorithm diff table, environment, and educational insights", () => {
    render(
      <SessionComparisonVisualizer
        sessionA={preset.sessionA}
        sessionB={preset.sessionB}
      />,
    );

    // Default tab: Charts
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();

    // Click Algorithm Diff Grid Tab
    const tableTabBtn = screen.getByRole("button", {
      name: /Algorithm Diff Grid/i,
    });
    fireEvent.click(tableTabBtn);
    expect(screen.getByPlaceholderText(/Search cipher algorithm/i)).toBeInTheDocument();
    expect(screen.getByText("AES-GCM (128-bit)")).toBeInTheDocument();

    // Click Environmental Specs Tab
    const envTabBtn = screen.getByRole("button", {
      name: /Environmental Specs/i,
    });
    fireEvent.click(envTabBtn);
    expect(
      screen.getByText("Environmental Context & Session Parameters"),
    ).toBeInTheDocument();

    // Click Educational Insights Tab
    const eduTabBtn = screen.getByRole("button", {
      name: /Educational Insights/i,
    });
    fireEvent.click(eduTabBtn);
    expect(
      screen.getByText(/Educational Insights: Understanding Session Performance Variance/i),
    ).toBeInTheDocument();
  });

  it("allows selecting a different preset scenario", () => {
    render(
      <SessionComparisonVisualizer
        sessionA={preset.sessionA}
        sessionB={preset.sessionB}
      />,
    );

    const inputScalingPresetBtn = screen.getByText(
      /1 KB vs 64 KB Input Payload Scaling/i,
    );
    fireEvent.click(inputScalingPresetBtn);

    // Verify metrics updated
    expect(screen.getByText(/1 KB vs 64 KB Input Payload Scaling/i)).toBeInTheDocument();
  });
});
