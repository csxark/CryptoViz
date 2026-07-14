export const STEP_QUERY_PARAM = "step";

export interface VisualizerPermalinkState {
  input: string;
  key: string;
  direction: "encrypt" | "decrypt";
  step: number;
  options: {
    hexInput: boolean;
    rounds: number;
    demoMode: boolean;
    bobSecret: string;
  };
}

export interface ParsedVisualizerPermalink {
  input?: string;
  key?: string;
  direction?: "encrypt" | "decrypt";
  step?: number;
  options: {
    hexInput?: boolean;
    rounds?: number;
    demoMode?: boolean;
    bobSecret?: string;
  };
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

function parseInteger(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function clampStepIndex(index: number, stepCount: number): number {
  if (!Number.isFinite(index) || stepCount <= 0) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), stepCount - 1);
}

export function parseVisualizerPermalink(
  search: string,
): ParsedVisualizerPermalink {
  const params = new URLSearchParams(search);
  const direction = params.get("direction");
  const rawStep = parseInteger(params.get(STEP_QUERY_PARAM));
  const rawRounds = parseInteger(params.get("rounds"));

  return {
    input: params.has("input") ? (params.get("input") ?? "") : undefined,
    key: params.has("key") ? (params.get("key") ?? "") : undefined,
    direction:
      direction === "encrypt" || direction === "decrypt"
        ? direction
        : undefined,
    step: rawStep === undefined ? undefined : Math.max(Math.trunc(rawStep), 0),
    options: {
      hexInput: parseBoolean(params.get("hexInput")),
      rounds:
        rawRounds === undefined
          ? undefined
          : Math.min(Math.max(rawRounds, 4), 31),
      demoMode: parseBoolean(params.get("demoMode")),
      bobSecret: params.has("bobSecret")
        ? (params.get("bobSecret") ?? "")
        : undefined,
    },
  };
}

export function buildVisualizerPermalink(
  currentUrl: string,
  state: VisualizerPermalinkState,
): string {
  const url = new URL(currentUrl);
  url.searchParams.set("input", state.input);
  url.searchParams.set("key", state.key);
  url.searchParams.set("direction", state.direction);
  url.searchParams.set(STEP_QUERY_PARAM, String(Math.max(0, state.step)));
  url.searchParams.set("hexInput", state.options.hexInput ? "1" : "0");
  url.searchParams.set("rounds", String(state.options.rounds));
  url.searchParams.set("demoMode", state.options.demoMode ? "1" : "0");
  url.searchParams.set("bobSecret", state.options.bobSecret);
  return url.toString();
}

export function updateStepInCurrentUrl(
  currentUrl: string,
  step: number | null,
): string {
  const url = new URL(currentUrl);

  if (step === null) {
    url.searchParams.delete(STEP_QUERY_PARAM);
  } else {
    url.searchParams.set(STEP_QUERY_PARAM, String(Math.max(0, step)));
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
