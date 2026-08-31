"use client";

import { useState, useMemo, useCallback } from "react";
import {
  encode,
  decode,
  FORMAT_REGISTRY,
  type EncodingFormat,
  type EncodingResult,
  type FormatInfo,
} from "../../lib/encoding/baseEncoding";
import {
  ArrowLeftRight,
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  Hash,
  Binary,
  Type,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* ─── Sample Inputs ────────────────────────────────────────────────────────── */

const SAMPLES: Record<EncodingFormat, string> = {
  base64: "Hello, World! 🔐",
  base32: "Hello, World!",
  hex: "Hello, World!",
  binary: "Hello",
  url: "https://example.com/path?q=hello world&lang=en",
  ascii: "Hello!",
  rot13: "Hello, World!",
  decimal: "Hello!",
}

const FORMAT_ICONS: Record<EncodingFormat, React.ElementType> = {
  base64: Zap,
  base32: Zap,
  hex: Hash,
  binary: Binary,
  url: Type,
  ascii: Hash,
  rot13: ArrowLeftRight,
  decimal: Hash,
}

/* ─── Category Colors ──────────────────────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  binary: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  text: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  numeric: "text-amber-400 bg-amber-500/10 border-amber-500/20",
}

/* ─── Steps Visualization ──────────────────────────────────────────────────── */

function StepsVisualization({ result }: { result: EncodingResult }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  if (result.steps.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
        Step-by-Step Breakdown ({result.steps.length} steps)
      </h3>
      {result.steps.map((step) => (
        <div
          key={step.step}
          className="rounded-xl border border-white/5 bg-slate-950/40 overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedStep(expandedStep === step.step ? null : step.step)
            }
            className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/10 text-[10px] font-bold text-teal-400 shrink-0">
              {step.step}
            </div>
            <span className="flex-1 text-xs font-semibold text-zinc-300">
              {step.description}
            </span>
            {expandedStep === step.step ? (
              <ChevronUp size={12} className="text-zinc-600" />
            ) : (
              <ChevronDown size={12} className="text-zinc-600" />
            )}
          </button>
          {expandedStep === step.step && (
            <div className="border-t border-white/5 p-3 space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Input
                </p>
                <p className="font-mono text-[11px] text-zinc-400 break-all bg-slate-900 rounded-lg p-2 max-h-20 overflow-y-auto">
                  {step.input || "(empty)"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Output
                </p>
                <p className="font-mono text-[11px] text-teal-400 break-all bg-slate-900 rounded-lg p-2 max-h-20 overflow-y-auto">
                  {step.output || "(empty)"}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Format Selector ──────────────────────────────────────────────────────── */

function FormatSelector({
  selected,
  onChange,
  label,
}: {
  selected: EncodingFormat;
  onChange: (f: EncodingFormat) => void;
  label: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
        {label}
      </label>
      <div className="grid grid-cols-4 gap-1.5">
        {FORMAT_REGISTRY.map((fmt) => {
          const Icon = FORMAT_ICONS[fmt.id];
          return (
            <button
              key={fmt.id}
              onClick={() => onChange(fmt.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all",
                selected === fmt.id
                  ? "border-teal-500/40 bg-teal-500/10"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              )}
            >
              <Icon
                size={14}
                className={selected === fmt.id ? "text-teal-400" : "text-zinc-600"}
              />
              <span
                className={cn(
                  "text-[10px] font-bold",
                  selected === fmt.id ? "text-white" : "text-zinc-500"
                )}
              >
                {fmt.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function EncodingToolkit() {
  const [inputText, setInputText] = useState("Hello, World! 🔐");
  const [sourceFormat, setSourceFormat] = useState<EncodingFormat>("base64");
  const [targetFormat, setTargetFormat] = useState<EncodingFormat>("hex");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const result: EncodingResult | null = useMemo(() => {
    if (!inputText.trim()) return null;
    try {
      if (mode === "encode") {
        return encode(inputText, targetFormat);
      } else {
        return decode(inputText, targetFormat);
      }
    } catch {
      return {
        input: inputText,
        format: targetFormat,
        output: "",
        steps: [],
        inputBytes: 0,
        outputBytes: 0,
        sizeRatio: 0,
        success: false,
        error: "Conversion failed — check your input",
      };
    }
  }, [inputText, targetFormat, mode]);

  // Cross-convert: encode source → target
  const crossResult = useMemo(() => {
    if (!inputText.trim()) return null;
    try {
      // First encode to target format, then decode back to source format
      const encoded = encode(inputText, targetFormat);
      if (!encoded.success) return null;
      const decoded = decode(encoded.output, targetFormat);
      return {
        forward: encoded,
        backward: decoded,
      };
    } catch {
      return null;
    }
  }, [inputText, targetFormat]);

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const handleSwapFormats = useCallback(() => {
    setSourceFormat(targetFormat);
    setTargetFormat(sourceFormat);
  }, [sourceFormat, targetFormat]);

  const handleSample = useCallback(() => {
    setInputText(SAMPLES[targetFormat] || "Hello, World!");
  }, [targetFormat]);

  const formatInfo = FORMAT_REGISTRY.find((f) => f.id === targetFormat);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
        <div className="relative isolate px-6 py-10 sm:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,196,174,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_35%)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-teal-400">
            Encoding Tool
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Base Encoding Toolkit
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Encode and decode between Base64, Base32, Hex, Binary, URL encoding, ASCII, ROT13, and Decimal with step-by-step visualization of the transformation process.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-5">
              <p className="text-sm font-semibold text-teal-300">
                8 Formats
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Each conversion shows the exact bit manipulation and mapping steps, making encoding algorithms transparent and educational.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Format Quick Info */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3">
          Available Formats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FORMAT_REGISTRY.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => {
                setTargetFormat(fmt.id);
                setInputText(SAMPLES[fmt.id] || "");
              }}
              className={cn(
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                targetFormat === fmt.id
                  ? "border-teal-500/40 bg-teal-500/10"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              )}
            >
              <span className="text-xs font-bold text-white">{fmt.name}</span>
              <span
                className={cn(
                  "mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border",
                  CATEGORY_COLORS[fmt.category]
                )}
              >
                {fmt.category}
              </span>
              <span className="mt-1 text-[10px] text-zinc-600">
                Expand: {fmt.expandFactor}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Column: Input & Controls */}
        <div className="space-y-6">
          {/* Mode & Format Selection */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setMode("encode")}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  mode === "encode"
                    ? "bg-teal-500 text-slate-950"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                Encode
              </button>
              <button
                onClick={() => setMode("decode")}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  mode === "decode"
                    ? "bg-teal-500 text-slate-950"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                Decode
              </button>
            </div>

            {/* Target Format */}
            <FormatSelector
              selected={targetFormat}
              onChange={setTargetFormat}
              label={mode === "encode" ? "Encode to" : "Decode from"}
            />

            {/* Input */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  {mode === "encode" ? "Input Text" : "Encoded Input"}
                </label>
                <button
                  onClick={handleSample}
                  className="text-[10px] text-teal-400 hover:text-teal-300"
                >
                  Load sample →
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  mode === "encode"
                    ? "Type text to encode..."
                    : "Paste encoded text to decode..."
                }
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 font-mono text-sm text-white outline-none ring-teal-500/40 focus:ring-2 resize-none placeholder:text-zinc-600"
              />
              <div className="mt-1 text-[10px] text-zinc-600">
                {inputText.length} characters
              </div>
            </div>
          </section>

          {/* Format Details */}
          {formatInfo && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-teal-400" />
                <h2 className="text-lg font-bold text-white">
                  {formatInfo.name} Details
                </h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Description
                  </p>
                  <p className="text-xs text-zinc-400">{formatInfo.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                      Category
                    </p>
                    <span
                      className={cn(
                        "text-xs font-bold uppercase px-2 py-0.5 rounded border",
                        CATEGORY_COLORS[formatInfo.category]
                      )}
                    >
                      {formatInfo.category}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                      Size Factor
                    </p>
                    <p className="text-xs font-bold font-mono text-white">
                      {formatInfo.expandFactor}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Use Case
                  </p>
                  <p className="text-xs text-zinc-400">{formatInfo.useCase}</p>
                </div>
                {formatInfo.alphabet && (
                  <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                      Alphabet ({formatInfo.alphabet.length} chars)
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500 break-all leading-relaxed">
                      {formatInfo.alphabet}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Output */}
        <div className="space-y-6">
          {/* Output */}
          {result && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {result.success
                    ? mode === "encode"
                      ? "Encoded Output"
                      : "Decoded Output"
                    : "Error"}
                </h2>
                {result.success && (
                  <button
                    onClick={() => handleCopy(result.output, "output")}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {copiedField === "output" ? (
                      <Check size={12} />
                    ) : (
                      <Copy size={12} />
                    )}
                    Copy
                  </button>
                )}
              </div>
              <div className="mt-4">
                {result.success ? (
                  <div className="rounded-2xl border border-white/5 bg-slate-950 p-5">
                    <p className="font-mono text-sm text-teal-300 leading-relaxed break-all whitespace-pre-wrap">
                      {result.output}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <p className="text-sm text-red-300">{result.error}</p>
                  </div>
                )}
              </div>
              {result.success && (
                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
                  <span>Input: {result.inputBytes} bytes</span>
                  <span>Output: {result.outputBytes} bytes</span>
                  <span>
                    Ratio: {result.sizeRatio.toFixed(2)}x
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Step-by-Step */}
          {result && result.success && result.steps.length > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
              <StepsVisualization result={result} />
            </section>
          )}

          {/* Quick Reference */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">
              Quick Reference
            </h2>
            <div className="mt-3 space-y-2">
              {[
                { input: "A", base64: "QQ==", hex: "41", binary: "01000001", decimal: "65" },
                { input: "AB", base64: "QUI=", hex: "4142", binary: "01000001 01000010", decimal: "65 66" },
                { input: "Hi", base64: "SEk=", hex: "4869", binary: "01001000 01101001", decimal: "72 105" },
              ].map((row) => (
                <div
                  key={row.input}
                  className="grid grid-cols-5 gap-2 rounded-lg bg-slate-950/40 p-2 text-[10px] font-mono"
                >
                  <span className="text-white font-bold">{row.input}</span>
                  <span className="text-teal-400">{row.base64}</span>
                  <span className="text-amber-400">{row.hex}</span>
                  <span className="text-purple-400">{row.binary}</span>
                  <span className="text-zinc-500">{row.decimal}</span>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider px-2">
                <span>Input</span>
                <span>Base64</span>
                <span>Hex</span>
                <span>Binary</span>
                <span>Decimal</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
