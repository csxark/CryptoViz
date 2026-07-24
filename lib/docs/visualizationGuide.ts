export type GuideStageId =
  | "scope"
  | "algorithm"
  | "state"
  | "steps"
  | "worker"
  | "testing"
  | "accessibility"
  | "docs";

export interface VisualizationGuideStage {
  id: GuideStageId;
  title: string;
  summary: string;
  checklist: string[];
  example: string;
}

export interface VisualizationGuideQualityCheck {
  label: string;
  description: string;
  required: boolean;
}

export const VISUALIZATION_GUIDE_STAGES: VisualizationGuideStage[] = [
  {
    id: "scope",
    title: "Define the learning goal",
    summary:
      "Start by deciding what the visualizer should teach before writing UI code.",
    checklist: [
      "Identify the algorithm or cryptographic concept.",
      "Write the expected learner takeaway in one sentence.",
      "Choose safe demo inputs that do not encourage misuse.",
      "Decide whether the module is encryption, hashing, key exchange, or attack education.",
    ],
    example:
      "A SHA-256 visualizer should teach padding, block processing, compression rounds, and final digest output.",
  },
  {
    id: "algorithm",
    title: "Keep the algorithm deterministic",
    summary:
      "The same input, key, and options should always produce the same output and step trace.",
    checklist: [
      "Use pure TypeScript utilities where possible.",
      "Keep randomness explicit and testable.",
      "Validate input size and key format before running.",
      "Return friendly CipherError messages for invalid user input.",
    ],
    example:
      "For a hash visualizer, expose a pure helper that returns the digest and a separate instrumented path that returns steps.",
  },
  {
    id: "state",
    title: "Model state clearly",
    summary:
      "Visualizer state should be easy to reason about, reset, serialize, and share.",
    checklist: [
      "Separate input, key, direction, options, output, and selected step.",
      "Reset stale steps when input or options change.",
      "Avoid storing secrets unless the feature explicitly requires it.",
      "Prefer small reusable utilities for localStorage or URL serialization.",
    ],
    example:
      "A comparison workspace can store two panel states, each containing cipherId, direction, key, and mapped options.",
  },
  {
    id: "steps",
    title: "Design educational steps",
    summary:
      "Each step should explain what changed, why it changed, and which bytes or values matter.",
    checklist: [
      "Give every step a short label and human-readable note.",
      "Use matrices, tables, or highlights only when they improve understanding.",
      "Mark major milestones for summary mode.",
      "Keep long traces readable and performant.",
    ],
    example:
      "AES can mark SubBytes, ShiftRows, MixColumns, AddRoundKey, and final round as milestones.",
  },
  {
    id: "worker",
    title: "Use workers for heavy work",
    summary: "Expensive operations should not block the main UI thread.",
    checklist: [
      "Integrate long-running ciphers with the existing cipher worker.",
      "Return structured success and error responses.",
      "Support cancellation or timeout behavior for slow operations.",
      "Cache results only when it is safe and deterministic.",
    ],
    example:
      "A password-hashing visualizer can run in a worker so playback controls remain responsive.",
  },
  {
    id: "testing",
    title: "Test the behavior",
    summary:
      "Tests should prove the algorithm, utility logic, and UI states work without relying on screenshots.",
    checklist: [
      "Add known-answer test vectors.",
      "Test invalid input and error handling.",
      "Test instrumented step shape.",
      "Add focused UI tests for new reusable components when practical.",
    ],
    example:
      "For XXHash32, tests should verify known vectors, seed parsing, invalid seeds, instrumentation, and unsupported decrypt behavior.",
  },
  {
    id: "accessibility",
    title: "Make interactions accessible",
    summary:
      "Interactive cryptography education should work with keyboard and assistive technology.",
    checklist: [
      "Use semantic buttons, labels, headings, and tables.",
      "Provide visible focus states.",
      "Expose dynamic status messages with accessible text.",
      "Avoid color-only explanations for important state changes.",
    ],
    example:
      "A step timeline should allow keyboard navigation and expose the active step with text, not color alone.",
  },
  {
    id: "docs",
    title: "Document security context",
    summary:
      "Every visualization should explain what the concept is and what it should not be used for.",
    checklist: [
      "Add a short documentation page or markdown note.",
      "Mention whether the primitive is secure, legacy, broken, or educational only.",
      "Explain safe use and common misuse.",
      "Include manual testing notes in the PR.",
    ],
    example:
      "A dictionary attack simulator should state that it is for local demo hashes only and explain defensive controls.",
  },
];

export const VISUALIZATION_GUIDE_QUALITY_CHECKS: VisualizationGuideQualityCheck[] =
  [
    {
      label: "Educational clarity",
      description:
        "The module explains the concept in plain language and not only through code output.",
      required: true,
    },
    {
      label: "Deterministic output",
      description:
        "Given the same input, key, and options, the module produces the same result and trace.",
      required: true,
    },
    {
      label: "Friendly errors",
      description:
        "Invalid input produces useful messages instead of crashes or blank screens.",
      required: true,
    },
    {
      label: "Responsive layout",
      description:
        "The interface remains usable on mobile, tablet, and desktop widths.",
      required: true,
    },
    {
      label: "Accessible controls",
      description:
        "Interactive controls are keyboard-accessible and have readable labels.",
      required: true,
    },
    {
      label: "Focused tests",
      description:
        "New utilities or algorithm behavior are covered with focused unit tests.",
      required: true,
    },
    {
      label: "Documentation",
      description:
        "A doc page or markdown file explains behavior, safety notes, and manual testing.",
      required: true,
    },
    {
      label: "Worker integration",
      description: "Heavy computations use a worker where applicable.",
      required: false,
    },
  ];

export function getVisualizationGuideStage(
  id: GuideStageId,
): VisualizationGuideStage {
  const stage = VISUALIZATION_GUIDE_STAGES.find((item) => item.id === id);

  if (!stage) {
    throw new Error(`Unknown visualization guide stage: ${id}`);
  }

  return stage;
}

export function calculateGuideCompletion(
  completedStageIds: GuideStageId[],
): number {
  const uniqueCompleted = new Set(completedStageIds);
  const completedCount = VISUALIZATION_GUIDE_STAGES.filter((stage) =>
    uniqueCompleted.has(stage.id),
  ).length;

  return Math.round((completedCount / VISUALIZATION_GUIDE_STAGES.length) * 100);
}

export function buildManualTestingChecklist(featureName: string): string[] {
  const name = featureName.trim() || "the new visualization";

  return [
    `Open ${name} in the browser.`,
    "Confirm the page renders without console errors.",
    "Try the default demo input and confirm output appears.",
    "Change input/options and confirm the visualization updates.",
    "Trigger one invalid input and confirm a friendly error appears.",
    "Check keyboard navigation for main controls.",
    "Resize to mobile width and confirm the layout remains usable.",
    "Run the focused test file for the new feature.",
  ];
}

export function groupQualityChecksByRequirement() {
  return {
    required: VISUALIZATION_GUIDE_QUALITY_CHECKS.filter(
      (check) => check.required,
    ),
    recommended: VISUALIZATION_GUIDE_QUALITY_CHECKS.filter(
      (check) => !check.required,
    ),
  };
}
