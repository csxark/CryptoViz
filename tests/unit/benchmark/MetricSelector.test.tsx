import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MetricSelector from "@/components/benchmark/MetricSelector";

describe("MetricSelector", () => {
  it("renders metric label and all metric options", () => {
    render(<MetricSelector activeMetric="throughput" onMetricChange={vi.fn()} />);

    expect(screen.getByText("Select Chart Metric:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Throughput \(ops\/sec\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cipher Time \(ms\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Worker RTT \(ms\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Memory Usage \(KB\)/i })).toBeInTheDocument();
  });

  it("calls onMetricChange with selected metric ID on click", () => {
    const onMetricChange = vi.fn();
    render(<MetricSelector activeMetric="throughput" onMetricChange={onMetricChange} />);

    const latencyBtn = screen.getByRole("button", { name: /Cipher Time \(ms\)/i });
    fireEvent.click(latencyBtn);

    expect(onMetricChange).toHaveBeenCalledTimes(1);
    expect(onMetricChange).toHaveBeenCalledWith("latency");
  });
});
