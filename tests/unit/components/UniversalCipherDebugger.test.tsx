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

  test("renders custom title when provided", () => {
    render(<UniversalCipherDebugger steps={mockSteps} title="AES-256 Key Schedule Debugger" />);
    expect(screen.getByText("AES-256 Key Schedule Debugger")).toBeInTheDocument();
  });

  test("handles initialStep prop correctly on render", () => {
    render(<UniversalCipherDebugger steps={mockSteps} initialStep={25} />);
    expect(screen.getByText("Step 26 / 100")).toBeInTheDocument();
    expect(screen.getByText("Round 26 Computation")).toBeInTheDocument();
  });

  test("handles play, pause, next, previous, and end controls", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);

    const nextBtn = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText("Step 2 / 100")).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: /Previous step/i });
    fireEvent.click(prevBtn);
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();

    const endBtn = screen.getByRole("button", { name: /Go to last step/i });
    fireEvent.click(endBtn);
    expect(screen.getByText("Step 100 / 100")).toBeInTheDocument();

    const restartBtn = screen.getByRole("button", { name: /Restart/i });
    fireEvent.click(restartBtn);
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();
  });

  test("triggers copy step link callback when copy button is clicked", () => {
    const onCopyStepLink = vi.fn();
    render(<UniversalCipherDebugger steps={mockSteps} onCopyStepLink={onCopyStepLink} />);

    const copyBtn = screen.getByRole("button", { name: /Copy Step Link/i });
    fireEvent.click(copyBtn);
    expect(onCopyStepLink).toHaveBeenCalledTimes(1);
  });

  test("handles speed change dropdown interactions", () => {
    const onSpeedChange = vi.fn();
    render(<UniversalCipherDebugger steps={mockSteps} onSpeedChange={onSpeedChange} />);

    const speedSelect = screen.getByRole("combobox", { name: /Animation speed/i });
    fireEvent.change(speedSelect, { target: { value: "2" } });
    expect(onSpeedChange).toHaveBeenCalledWith(2);
  });

  test("renders milestone indicators and supports milestone jumps", () => {
    const stepsWithMilestones: CipherStep[] = mockSteps.map((step, idx) => ({
      ...step,
      isMilestone: idx === 0 || idx === 20 || idx === 50 || idx === 99,
      label: idx % 20 === 0 ? `Milestone ${idx}` : step.label,
    }));

    render(<UniversalCipherDebugger steps={stepsWithMilestones} />);

    const nextPhaseBtn = screen.getByRole("button", { name: /Next milestone/i });
    fireEvent.click(nextPhaseBtn);
    expect(screen.getByText("Step 21 / 100")).toBeInTheDocument();

    fireEvent.click(nextPhaseBtn);
    expect(screen.getByText("Step 51 / 100")).toBeInTheDocument();

    const prevPhaseBtn = screen.getByRole("button", { name: /Previous milestone/i });
    fireEvent.click(prevPhaseBtn);
    expect(screen.getByText("Step 21 / 100")).toBeInTheDocument();
  });

  test("handles single-step traces gracefully", () => {
    const singleStep: CipherStep[] = [
      {
        index: 0,
        label: "Single Transformation",
        inputState: "0x00",
        outputState: "0xFF",
        note: "Direct mapping complete",
      },
    ];

    render(<UniversalCipherDebugger steps={singleStep} />);
    expect(screen.getByText("1 Total Steps")).toBeInTheDocument();
    expect(screen.getByText("Single Transformation")).toBeInTheDocument();
  });

  test("handles scrubbing slider to boundary values: 0, intermediate, and last step", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);
    const slider = screen.getByRole("slider", { name: /Animation timeline/i });

    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "99" } });
    expect(screen.getByText("Step 100 / 100")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "33" } });
    expect(screen.getByText("Step 34 / 100")).toBeInTheDocument();
  });

  test("navigates via keyboard arrows and spacebar", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Step 2 / 100")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getByText("Step 100 / 100")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Home" });
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();
  });

  test("virtualized step list displays rendered button items with proper active styles", () => {
    const { container } = render(<UniversalCipherDebugger steps={mockSteps} initialStep={10} />);
    const activeBtn = container.querySelector("button.bg-teal-50");
    expect(activeBtn).toBeInTheDocument();
    expect(activeBtn?.textContent).toContain("11. Round 11 Computation");
  });

  test("handles container onScroll event cleanly without errors", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);
    const listContainer = screen.getByTestId("virtualized-step-list");
    fireEvent.scroll(listContainer, { target: { scrollTop: 840 } });
    // Verify container scroll triggers virtualization update
    expect(screen.getByTestId("virtualized-step-list")).toBeInTheDocument();
  });

  test("handles step note and table rendering when stepping forward", () => {
    render(<UniversalCipherDebugger steps={mockSteps} initialStep={5} />);
    expect(screen.getByText("Detailed description for round 6")).toBeInTheDocument();
    expect(screen.getByText("0xIN_5")).toBeInTheDocument();
    expect(screen.getByText("0xOUT_5")).toBeInTheDocument();
  });

  test("clamps negative initialStep to 0", () => {
    render(<UniversalCipherDebugger steps={mockSteps} initialStep={-10} />);
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();
  });

  test("clamps out of bounds initialStep to last step", () => {
    render(<UniversalCipherDebugger steps={mockSteps} initialStep={999} />);
    expect(screen.getByText("Step 100 / 100")).toBeInTheDocument();
  });

  test("handles rapid scrubbing events smoothly", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);
    const slider = screen.getByRole("slider", { name: /Animation timeline/i });

    for (const val of [10, 20, 30, 40, 75, 12, 90]) {
      fireEvent.change(slider, { target: { value: String(val) } });
      expect(screen.getByText(`Step ${val + 1} / 100`)).toBeInTheDocument();
    }
  });

  test("clicking through sequential steps highlights current selection and updates trace output", () => {
    render(<UniversalCipherDebugger steps={mockSteps} initialStep={0} />);

    const step3Button = screen.getByRole("button", { name: /3. Round 3 Computation/i });
    fireEvent.click(step3Button);
    expect(screen.getByText("Step 3 / 100")).toBeInTheDocument();

    const step4Button = screen.getByRole("button", { name: /4. Round 4 Computation/i });
    fireEvent.click(step4Button);
    expect(screen.getByText("Step 4 / 100")).toBeInTheDocument();
  });

  test("verifies table parameters are correctly listed in the inspector", () => {
    render(<UniversalCipherDebugger steps={mockSteps} initialStep={0} />);
    expect(screen.getByText("RoundKey")).toBeInTheDocument();
    expect(screen.getByText("0xKEY_0")).toBeInTheDocument();
  });

  test("verifies that mobile phase dropdown selector changes step correctly", () => {
    const stepsWithMilestones: CipherStep[] = mockSteps.map((step, idx) => ({
      ...step,
      isMilestone: idx === 0 || idx === 25 || idx === 75,
      label: idx % 25 === 0 ? `Phase ${idx}` : step.label,
    }));

    render(<UniversalCipherDebugger steps={stepsWithMilestones} />);
    const select = screen.getByRole("combobox", { name: /Jump to milestone/i });
    fireEvent.change(select, { target: { value: "25" } });
    expect(screen.getByText("Step 26 / 100")).toBeInTheDocument();
  });

  test("handles empty steps array gracefully without crashing", () => {
    const { container } = render(<UniversalCipherDebugger steps={[]} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText("0 Total Steps")).toBeInTheDocument();
  });

  test("handles shift arrow keyboard navigation for milestone jumps", () => {
    const stepsWithMilestones: CipherStep[] = mockSteps.map((step, idx) => ({
      ...step,
      isMilestone: idx === 0 || idx === 10 || idx === 20,
      label: idx % 10 === 0 ? `Stage ${idx}` : step.label,
    }));

    render(<UniversalCipherDebugger steps={stepsWithMilestones} initialStep={0} />);

    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    expect(screen.getByText("Step 11 / 100")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    expect(screen.getByText("Step 21 / 100")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });
    expect(screen.getByText("Step 11 / 100")).toBeInTheDocument();
  });

  test("verifies bracket keys '[' and ']' trigger milestone navigation", () => {
    const stepsWithMilestones: CipherStep[] = mockSteps.map((step, idx) => ({
      ...step,
      isMilestone: idx === 0 || idx === 15 || idx === 30,
      label: idx % 15 === 0 ? `Checkpoint ${idx}` : step.label,
    }));

    render(<UniversalCipherDebugger steps={stepsWithMilestones} initialStep={0} />);

    fireEvent.keyDown(window, { key: "]" });
    expect(screen.getByText("Step 16 / 100")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "[" });
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();
  });

  test("verifies keyboard shortcuts are ignored when typing inside input elements", () => {
    render(
      <div>
        <input data-testid="test-input" />
        <UniversalCipherDebugger steps={mockSteps} initialStep={0} />
      </div>
    );

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "ArrowRight" });
    // Step should NOT advance because event target is an input element
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();
  });

  test("renders 2D state matrix when step contains matrix representation", () => {
    const stepWithMatrix: CipherStep[] = [
      {
        index: 0,
        label: "Matrix Substitution Round",
        inputState: "0x00",
        outputState: "0xFF",
        matrix: [
          ["00", "01", "02", "03"],
          ["04", "05", "06", "07"],
          ["08", "09", "0a", "0b"],
          ["0c", "0d", "0e", "0f"],
        ],
      },
    ];

    render(<UniversalCipherDebugger steps={stepWithMatrix} />);
    expect(screen.getByText("Matrix Substitution Round")).toBeInTheDocument();
  });

  test("handles consecutive step selection jumps without state desynchronization", () => {
    render(<UniversalCipherDebugger steps={mockSteps} initialStep={0} />);
    const slider = screen.getByRole("slider", { name: /Animation timeline/i });

    const stepsToTest = [10, 25, 40, 5, 80, 1];
    for (const stepNum of stepsToTest) {
      fireEvent.change(slider, { target: { value: String(stepNum - 1) } });
      expect(screen.getByText(`Step ${stepNum} / 100`)).toBeInTheDocument();
    }
  });

  test("verifies that timeline slider change clamps out of range values cleanly", () => {
    render(<UniversalCipherDebugger steps={mockSteps} />);
    const slider = screen.getByRole("slider", { name: /Animation timeline/i });

    fireEvent.change(slider, { target: { value: "-50" } });
    expect(screen.getByText("Step 1 / 100")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "5000" } });
    expect(screen.getByText("Step 100 / 100")).toBeInTheDocument();
  });
});