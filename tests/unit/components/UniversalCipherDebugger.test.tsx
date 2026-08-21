import { render, screen, fireEvent } from "@testing-library/react";
import UniversalCipherDebugger from "@/components/cipher/UniversalCipherDebugger";
import type { CipherStep } from "@/lib/cipher/types";

describe("UniversalCipherDebugger Component", () => {
  const mockSteps: CipherStep[] = Array.from({ length: 100 }, (_, i) => ({
    index: i,
    label: `Round ${i + 1} Computation`,
    inputState: `0xIN_${i}`,
    outputState: `0xOUT_${i}`,
    note: `Detailed description for round ${i + 1}`,
    table: [
      { key: "State", value: `0x${i.toString(16).padStart(4, "0")}` },
      { key: "RoundKey", value: `0xKEY_${i}` },
    ],
  }));

  test("renders step debugger and virtualized viewport slice", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);

    expect(screen.getByText("100 Total Steps")).toBeInTheDocument();

    const renderedButtons = screen.getAllByRole("button", { name: /Round/i });
    expect(renderedButtons.length).toBeLessThan(100);
    expect(renderedButtons.length).toBeGreaterThan(0);
  });

  test("allows selecting a step from virtualized list and updates active view", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);

    const stepTwoButton = screen.getByRole("button", { name: /2. Round 2 Computation/i });
    fireEvent.click(stepTwoButton);

    expect(screen.getByText("Round 2 Computation")).toBeInTheDocument();
  });

  test("auto-scrolls and maintains step active alignment when scrubbing timeline", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);

    const slider = screen.getByRole("slider", { name: /Animation timeline/i });
    fireEvent.change(slider, { target: { value: "50" } });

    expect(screen.getByText("Step 51 / 100")).toBeInTheDocument();
  });
});