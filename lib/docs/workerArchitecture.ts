export type WorkerArchitectureSectionId =
  | "overview"
  | "request"
  | "execution"
  | "response"
  | "errors"
  | "performance"
  | "testing";

export interface WorkerArchitectureSection {
  id: WorkerArchitectureSectionId;
  title: string;
  summary: string;
  details: string[];
  codeExample: string;
}

export interface WorkerMessageStage {
  id: string;
  label: string;
  actor: "UI" | "Hook" | "Worker" | "Cipher Module";
  description: string;
}

export const WORKER_ARCHITECTURE_SECTIONS: WorkerArchitectureSection[] = [
  {
    id: "overview",
    title: "Why CryptoViz uses workers",
    summary:
      "Web Workers keep expensive cipher operations away from the main UI thread.",
    details: [
      "Visualizer playback, input fields, and navigation should remain responsive while heavy cryptographic operations run.",
      "The worker boundary separates UI state from algorithm execution.",
      "Structured worker messages make success, errors, and timing easier to inspect.",
    ],
    codeExample:
      "const worker = new Worker(new URL('../lib/workers/cipher.worker.ts', import.meta.url), { type: 'module' })",
  },
  {
    id: "request",
    title: "Request message shape",
    summary:
      "The UI sends a typed request containing operation type, request id, cipher id, input, key, and options.",
    details: [
      "A request id lets the hook match the correct response to the latest operation.",
      "The cipher id selects the algorithm branch inside the worker.",
      "Options carry mode, encoding, IV, instrumentation, and feature-specific settings.",
    ],
    codeExample:
      "worker.postMessage({ type: 'encrypt', requestId, payload: { cipherId, input, key, options } })",
  },
  {
    id: "execution",
    title: "Worker execution flow",
    summary:
      "The worker imports cipher modules and dispatches the request to the matching encrypt/decrypt function.",
    details: [
      "The worker receives the message event.",
      "It checks whether the request is encrypt or decrypt.",
      "It runs the selected cipher module and captures duration metadata.",
      "Unsupported cipher ids return a structured error.",
    ],
    codeExample:
      "result = encryptMode ? aesEncrypt(input, key, options) : aesDecrypt(input, key, options)",
  },
  {
    id: "response",
    title: "Response message shape",
    summary:
      "Successful operations return a structured result with output, steps, metadata, and timing.",
    details: [
      "The UI receives the response and updates result state.",
      "Instrumented operations can return educational steps for the visualizer.",
      "Timing values help compare algorithm cost without blocking the UI.",
    ],
    codeExample:
      "worker.postMessage({ requestId, success: true, payload: { result }, timings: { durationMs } })",
  },
  {
    id: "errors",
    title: "Error handling",
    summary:
      "Worker errors should become friendly UI messages instead of crashing the page.",
    details: [
      "Cipher modules should throw typed validation errors when possible.",
      "The worker converts thrown errors into response payloads.",
      "The UI should display the error and allow the user to change input safely.",
    ],
    codeExample:
      "worker.postMessage({ requestId, success: false, payload: { error: error.message }, timings })",
  },
  {
    id: "performance",
    title: "Performance and cancellation",
    summary:
      "Long-running operations need cancellation, timeout, and cache strategies.",
    details: [
      "Abort signals prevent stale requests from updating current UI state.",
      "Timeouts protect the interface from workers that never respond.",
      "Deterministic results can be cached when input, key, options, and direction match.",
    ],
    codeExample:
      "const cacheKey = JSON.stringify({ cipherId, direction, input, key, options })",
  },
  {
    id: "testing",
    title: "Testing worker behavior",
    summary:
      "Worker-related tests should cover success, error, timeout, abort, and cache behavior.",
    details: [
      "Unit tests can mock Worker instances for hook behavior.",
      "Integration tests can verify cipher ids are wired into the worker switch.",
      "New cipher PRs should include at least one focused worker or algorithm test.",
    ],
    codeExample:
      "expect(response.success).toBe(true)\nexpect(response.payload.result.output).toBe(expectedOutput)",
  },
];

export const WORKER_MESSAGE_FLOW: WorkerMessageStage[] = [
  {
    id: "collect-input",
    label: "Collect visualizer input",
    actor: "UI",
    description:
      "The page gathers cipher id, input, key, direction, and selected options from user controls.",
  },
  {
    id: "create-request",
    label: "Create request id",
    actor: "Hook",
    description:
      "The worker hook creates a request id so stale responses can be ignored.",
  },
  {
    id: "post-message",
    label: "Post message",
    actor: "Hook",
    description:
      "The hook sends a typed message to the cipher worker and starts timeout/cancellation tracking.",
  },
  {
    id: "dispatch-cipher",
    label: "Dispatch cipher",
    actor: "Worker",
    description:
      "The worker chooses the matching cipher module and encrypt/decrypt function.",
  },
  {
    id: "run-algorithm",
    label: "Run algorithm",
    actor: "Cipher Module",
    description:
      "The cipher module validates input and returns output, metadata, and optional visualization steps.",
  },
  {
    id: "return-response",
    label: "Return response",
    actor: "Worker",
    description:
      "The worker posts a success or error response with duration timing.",
  },
  {
    id: "render-result",
    label: "Render result",
    actor: "UI",
    description:
      "The page renders output, steps, metadata, or friendly error messages.",
  },
];

export function getWorkerArchitectureSection(
  id: WorkerArchitectureSectionId,
): WorkerArchitectureSection {
  const section = WORKER_ARCHITECTURE_SECTIONS.find((item) => item.id === id);

  if (!section) {
    throw new Error(`Unknown worker architecture section: ${id}`);
  }

  return section;
}

export function getMessageStagesByActor(actor: WorkerMessageStage["actor"]) {
  return WORKER_MESSAGE_FLOW.filter((stage) => stage.actor === actor);
}

export function calculateWorkerFlowProgress(activeStageIndex: number): number {
  if (activeStageIndex <= 0) return 0;

  const finalIndex = WORKER_MESSAGE_FLOW.length - 1;
  if (activeStageIndex >= finalIndex) return 100;

  return Math.round((activeStageIndex / finalIndex) * 100);
}

export function buildWorkerManualTestingChecklist(
  featureName: string,
): string[] {
  const name = featureName.trim() || "the worker-backed feature";

  return [
    `Open ${name} in the browser.`,
    "Run the default demo input and confirm output appears.",
    "Enable visualization or instrumented mode if available.",
    "Change input, key, or options and confirm the worker returns updated output.",
    "Trigger invalid input and confirm a friendly error appears.",
    "Run a second request quickly and confirm stale output does not replace the latest result.",
    "Check that the UI remains responsive while the operation runs.",
    "Run focused tests for the worker or cipher module touched by the feature.",
  ];
}
