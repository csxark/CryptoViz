'use client';

import React, { useState } from 'react';
import { getProtocolMessages, evaluateProtocolTransition, ProtocolState, ProtocolMessage, VerificationResult } from '@/lib/formal/banLogicEngine';
import { ShieldCheck, ShieldAlert, GitCommit, RefreshCw, Sparkles, Terminal } from 'lucide-react';

export default function ProtocolStateMachine() {
  const [currentState, setCurrentState] = useState<ProtocolState>('Idle');
  const [messages, setMessages] = useState<ProtocolMessage[]>(getProtocolMessages());
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [simulationLog, setSimulationLog] = useState<string[]>(['Protocol session initialized in state: Idle']);

  const handleInjectMessage = (msg: ProtocolMessage, isReplay: boolean = false) => {
    const packet = { ...msg, isReplay };
    const result = evaluateProtocolTransition(currentState, packet);

    setVerificationResult(result);

    if (result.isValidTransition) {
      setCurrentState(result.nextState);
      setSimulationLog(prev => [`[SUCCESS] Processed message: ${msg.name} -> Transitioned to ${result.nextState}`, ...prev]);
    } else {
      setSimulationLog(prev => [`[VULNERABILITY] ${result.vulnerabilityDetected}`, ...prev]);
    }
  };

  const handleReset = () => {
    setCurrentState('Idle');
    setVerificationResult(null);
    setSimulationLog(['Protocol session reset to state: Idle']);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm font-inter text-neutral-900 dark:text-neutral-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold font-playfair flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Formal Protocol State Machine & BAN Logic Inspector
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Simulate protocol state transitions, inject out-of-order packets, and trace formal belief derivations.</p>
        </div>
        <button onClick={handleReset} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Reset Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Machine Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Current State Machine Node</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 font-mono">
                {currentState}
              </span>
            </div>

            {/* Message Fuzzer Panel */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Available Protocol Packets (Fuzzer Injector)</span>
              <div className="grid grid-cols-1 gap-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="font-mono font-semibold">{msg.name}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleInjectMessage(msg, false)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition"
                      >
                        Transmit
                      </button>
                      {msg.id === 'msg3' && (
                        <button
                          onClick={() => handleInjectMessage(msg, true)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition"
                          title="Simulate Lowe's 1995 Replay Attack"
                        >
                          Inject Replay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${verificationResult.isValidTransition ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'}`}>
                <div className="flex items-center gap-2 font-bold">
                  {verificationResult.isValidTransition ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {verificationResult.isValidTransition ? 'Transition Validated & Invariants Maintained' : verificationResult.vulnerabilityDetected}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BAN Logic Belief Tree & Logs */}
        <div className="space-y-4">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-amber-500" /> BAN Logic Belief Tree
            </h3>
            {verificationResult?.beliefs ? (
              <div className="space-y-2">
                {verificationResult.beliefs.map((belief, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 text-xs">
                    <div className="font-mono font-bold text-amber-600">{belief.statement}</div>
                    <p className="text-neutral-500">{belief.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">Transmit messages to derive formal BAN logic beliefs.</p>
            )}
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-500" /> Execution Audit Log
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px] text-neutral-500">
              {simulationLog.map((log, idx) => (
                <div key={idx} className="pb-1 border-b border-neutral-200 dark:border-neutral-800/50">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
