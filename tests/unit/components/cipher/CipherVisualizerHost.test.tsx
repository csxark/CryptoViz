import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import CipherVisualizerHost from "../../../../components/cipher/CipherVisualizerHost";

vi.mock("@/components/visualizers/visualizerComponentRegistry", () => ({
  getVisualizerComponent: () => null,
}));

describe("CipherVisualizerHost", () => {
  it("renders nothing when there is no trace to visualize", () => {
    const { container } = render(<CipherVisualizerHost cipherId="aes" result={null} currentStep={0} onStepChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
