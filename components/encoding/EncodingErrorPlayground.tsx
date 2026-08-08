'use client';

import React, { useState, useMemo } from 'react';
import { EncodingType, FaultType } from '@/lib/encoding/types';
import {
  detectEncodingErrors,
  injectEncodingFault,
  simulateMojibake,
  autoFixEncodingError,
  buildByteInspector,
} from '@/lib/encoding/encodingErrors';
import { AlertCircle, CheckCircle2, Wrench, Zap, Bug, FileCode } from 'lucide-react';

export default function EncodingErrorPlayground() {
  const [activeTab, setActiveTab] = useState<'debugger' | 'faults' | 'mojibake'>('debugger');
  const [encoding, setEncoding] = useState<EncodingType>('Base64');
  const [inputText, setInputText] = useState('SGVsbG8sIFdvcmxkIQ=='); // "Hello, World!" in B64
  const [mojibakeInput, setMojibakeInput] = useState('Café & Résumé');

  const encodings: EncodingType[] = ['Base64', 'Hex', 'UTF-8', 'ASCII', 'URL-Encoding'];

  // Diagnostic calculations
  const errors = useMemo(() => detectEncodingErrors(inputText, encoding), [inputText, encoding]);
  const byteItems = useMemo(() => buildByteInspector(inputText, encoding), [inputText, encoding]);
  const mojibakeResult = useMemo(() => simulateMojibake(mojibakeInput), [mojibakeInput]);

  const handleInjectFault = (fault: FaultType) => {
    const res = injectEncodingFault(inputText, encoding, fault);
    setInputText(res.corrupted);
  };

  const handleAutoFix = () => {
    const fixed = autoFixEncodingError(inputText, encoding);
    setInputText(fixed);
  };

  return (
    <div className="space-y-8">
      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3" role="tablist" aria-label="Playground mode selector">
        <button
          role="tab"
          aria-selected={activeTab === 'debugger'}
          onClick={() => setActiveTab('debugger')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'debugger'
              ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
          }`}
        >
          <Bug className="h-4 w-4" />
          Invalid Input Debugger
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'faults'}
          onClick={() => setActiveTab('faults')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'faults'
              ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
          }`}
        >
          <Zap className="h-4 w-4" />
          Fault Injection Engine
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'mojibake'}
          onClick={() => setActiveTab('mojibake')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'mojibake'
              ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
          }`}
        >
          <FileCode className="h-4 w-4" />
          Mojibake Simulator (UTF-8 / Latin-1)
        </button>
      </div>

      {/* Mode 1 & 2: Debugger & Faults */}
      {(activeTab === 'debugger' || activeTab === 'faults') && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/50 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <label htmlFor="encoding-select" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Target Encoding:
              </label>
              <select
                id="encoding-select"
                value={encoding}
                onChange={e => setEncoding(e.target.value as EncodingType)}
                aria-label="Select target encoding scheme"
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 focus:outline-none"
              >
                {encodings.map(enc => (
                  <option key={enc} value={enc}>
                    {enc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoFix}
                className="flex items-center gap-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 px-3 py-1.5 text-xs font-bold transition-colors"
              >
                <Wrench className="h-3.5 w-3.5" />
                Auto-Repair Encoding
              </button>

              <button
                onClick={() => setInputText('SGVsbG8sIFdvcmxkIQ==')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Reset Input
              </button>
            </div>
          </div>

          {/* Input Text Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <label htmlFor="encoded-input-textarea" className="text-zinc-700 dark:text-zinc-300">
                Encoded String Input:
              </label>
              <span className="text-zinc-500">
                {inputText.length} chars | {errors.length} errors detected
              </span>
            </div>

            <textarea
              id="encoded-input-textarea"
              rows={3}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste or type encoded data..."
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 font-mono text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
            />
          </div>

          {/* Fault Injector Buttons (If Faults tab active) */}
          {activeTab === 'faults' && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Inject Deliberate Encoding Faults:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleInjectFault('INVALID_CHAR')}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  + Illegal Character
                </button>

                <button
                  onClick={() => handleInjectFault('TRUNCATED_SEQUENCE')}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  + Truncate Sequence
                </button>

                <button
                  onClick={() => handleInjectFault('PADDING_CORRUPTION')}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  + Corrupt Padding
                </button>

                <button
                  onClick={() => handleInjectFault('ODD_LENGTH_HEX')}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  + Odd-length Hex
                </button>

                <button
                  onClick={() => handleInjectFault('MALFORMED_URL_PERCENT')}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  + Malformed Percent
                </button>
              </div>
            </div>
          )}

          {/* Byte Timeline Inspector */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Byte-by-Byte Timeline Inspector
            </h4>

            {byteItems.length > 0 ? (
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                {byteItems.map(item => (
                  <div
                    key={item.index}
                    title={item.errorMessage || `Index ${item.index}: Char '${item.char}' (Hex: 0x${item.hex})`}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 min-w-[3.25rem] text-center font-mono transition-all ${
                      item.isError
                        ? 'border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-zinc-400">[{item.index}]</span>
                    <span className="text-sm font-black my-0.5">{item.char}</span>
                    <span className="text-[9px] text-zinc-500">0x{item.hex}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">Enter text above to inspect byte structures.</p>
            )}
          </div>

          {/* Diagnostic Error Log */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                {errors.length > 0 ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Decoder Specification Failures ({errors.length})
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Valid Encoded Sequence (0 Errors)
                  </>
                )}
              </h4>
            </div>

            {errors.length > 0 ? (
              <div className="space-y-3">
                {errors.map((err) => (
                  <div key={`${err.index}-${err.reason}`} className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-3.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-3">
                    <span className="font-mono bg-red-500/20 px-2 py-0.5 rounded font-bold shrink-0">
                      Offset [{err.index}]
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-semibold">{err.reason}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        Offending character: "{err.invalidValue}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The provided string strictly complies with the specification for <strong>{encoding}</strong>. No decoding exceptions or illegal character offset violations detected.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Mojibake Simulator */}
      {activeTab === 'mojibake' && (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              Character Set Misinterpretation (Mojibake)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Observe what happens when UTF-8 encoded text is decoded by legacy ISO-8859-1 or Windows-1252 software.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="mojibake-input-text" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Input Text with Special Accents or Non-ASCII Chars:
            </label>
            <input
              id="mojibake-input-text"
              type="text"
              value={mojibakeInput}
              aria-label="Input text for Mojibake simulation"
              onChange={e => setMojibakeInput(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Mojibake Output Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                1. Intended UTF-8 Encoding
              </span>
              <p className="text-base font-bold text-zinc-900 dark:text-white">{mojibakeResult.originalText}</p>
              <p className="text-xs font-mono text-zinc-500">Bytes: {mojibakeResult.encodedBytesHex}</p>
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                2. Mojibake Output (Decoded as Latin-1)
              </span>
              <p className="text-base font-bold text-red-600 dark:text-red-400 font-mono">
                {mojibakeResult.interpretedText}
              </p>
              <p className="text-xs text-zinc-500">Notice garbled characters like Ã© instead of é.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-4 text-xs text-teal-700 dark:text-teal-300 leading-relaxed font-medium">
            💡 <strong>Why this happens:</strong> {mojibakeResult.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
