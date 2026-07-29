import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SkeletonCard from "@/components/ui/SkeletonCard";
import StepAnimator from "@/components/cipher/StepAnimator";
import PlayfairGrid from "@/components/cipher/PlayfairGrid";
import ByteHeatmap from "@/components/ui/ByteHeatmap";

describe("Visualization Component Snapshot Tests", () => {
  it("matches snapshot for SkeletonCard component", () => {
    const { asFragment } = render(<SkeletonCard />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot for StepAnimator component", () => {
    const steps = [
      { index: 0, label: "Initialize Cipher", inputState: "A", outputState: "A", note: "Set initial state" },
      { index: 1, label: "Shift Bytes", inputState: "A", outputState: "D", note: "Shift by key offset 3" },
    ];
    const { asFragment } = render(
      <StepAnimator
        steps={steps}
        currentStep={0}
        onStepChange={() => {}}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot for PlayfairGrid matrix component", () => {
    const grid = [
      ["M", "O", "N", "A", "R"],
      ["C", "H", "Y", "B", "D"],
      ["E", "F", "G", "I", "K"],
      ["L", "P", "Q", "S", "T"],
      ["U", "V", "W", "X", "Z"],
    ];
    const { asFragment } = render(<PlayfairGrid matrix={grid} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot for ByteHeatmap component", () => {
    const bytes = [
      { index: 0, hex: "41", changed: true, changedBits: 3 },
      { index: 1, hex: "42", changed: true, changedBits: 6 },
    ];
    const { asFragment } = render(<ByteHeatmap bytes={bytes} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
