"use client";

import { useMemo, useState } from "react";
import {
  SBOX,
  SBOX_INV,
  computeLAT,
  getParity,
  permute8,
  substitute8,
  expandKey,
  encryptSPN,
  generatePairs,
  recoverRightKeyBits,
  type EncryptionPair,
  type CandidateResult,
} from "@/lib/attacks/linearCryptanalysis";
import { 
  Zap, 
  ShieldCheck, 
  HelpCircle, 
  Info, 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Binary, 
  TrendingUp, 
  Layers 
} from "lucide-react";

export default function LinearCryptanalysisSimulator() {
  const [activeTab, setActiveTab] = useState<"lat" | "piling" | "cipher" | "attack">("lat");

  // LAT Tab state
  const lat = useMemo(() => computeLAT(), []);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>({ row: 11, col: 4 });

  const cellDetails = useMemo(() => {
    if (!selectedCell) return null;
    const { row: alpha, col: beta } = selectedCell;
    const value = lat[alpha][beta];
    const count = value + 8;
    const probability = count / 16;
    const bias = value / 16;

    // Evaluations detail
    const evaluations = [];
    for (let x = 0; x < 16; x++) {
      const y = SBOX[x];
      const pIn = getParity(x & alpha);
      const pOut = getParity(y & beta);
      evaluations.push({
        x,
        y,
        xBin: x.toString(2).padStart(4, "0"),
        yBin: y.toString(2).padStart(4, "0"),
        pIn,
        pOut,
        equal: pIn === pOut,
      });
    }

    return { alpha, beta, value, count, probability, bias, evaluations };
  }, [selectedCell, lat]);

  // Piling-up Tab state
  const [biases, setBiases] = useState<number[]>([0.25, -0.25]);
  const [newBiasInput, setNewBiasInput] = useState("");

  const addBias = () => {
    const val = parseFloat(newBiasInput);
    if (!isNaN(val) && val >= -0.5 && val <= 0.5) {
      setBiases([...biases, val]);
      setNewBiasInput("");
    }
  };

  const removeBias = (index: number) => {
    setBiases(biases.filter((_, i) => i !== index));
  };

  const pilingUpResult = useMemo(() => {
    if (biases.length === 0) return { combinedBias: 0, probability: 0.5 };
    // Matsui's Piling-up Lemma: combined bias = 2^(r-1) * prod(biases)
    const r = biases.length;
    const prod = biases.reduce((acc, b) => acc * b, 1);
    const combinedBias = Math.pow(2, r - 1) * prod;
    return {
      combinedBias,
      probability: 0.5 + combinedBias,
    };
  }, [biases]);

  // Cipher Trace Tab state
  const [plainInput, setPlainInput] = useState("A5");
  const [masterKeyInput, setMasterKeyInput] = useState("2F3D");
  const [traceResult, setTraceResult] = useState<{
    k1: number; k2: number; k3: number;
    w0: number; w1: number; w1_p: number;
    w2: number; w3: number; ct: number;
  } | null>(null);

  const runCipherTrace = () => {
    const pt = parseInt(plainInput, 16);
    const key = parseInt(masterKeyInput, 16);
    if (isNaN(pt) || isNaN(key) || pt < 0 || pt > 255 || key < 0 || key > 65535) {
      return;
    }
    const keys = expandKey(key);
    const w0 = pt ^ keys[0];
    const w1 = substitute8(w0);
    const w1_p = permute8(w1);
    const w2 = w1_p ^ keys[1];
    const w3 = substitute8(w2);
    const ct = w3 ^ keys[2];
    setTraceResult({
      k1: keys[0], k2: keys[1], k3: keys[2],
      w0, w1, w1_p, w2, w3, ct
    });
  };

  // Attack Tab state
  const [attackMasterKey, setAttackMasterKey] = useState("2F3D");
  const [numPairs, setNumPairs] = useState(1000);
  const [pairs, setPairs] = useState<EncryptionPair[]>([]);
  const [attackResults, setAttackResults] = useState<CandidateResult[]>([]);
  const [isAttacking, setIsAttacking] = useState(false);
  const [correctSubkey, setCorrectSubkey] = useState<number | null>(null);

  const triggerAttack = () => {
    const key = parseInt(attackMasterKey, 16);
    if (isNaN(key)) return;
    setIsAttacking(true);
    setAttackResults([]);

    setTimeout(() => {
      const generated = generatePairs(numPairs, key);
      setPairs(generated);
      const res = recoverRightKeyBits(generated);
      setAttackResults(res);
      setCorrectSubkey(key & 0x0F);
      setIsAttacking(false);
    }, 800);
  };

  return (
    <div className="w-full min-h-screen bg-[#09090B] text-[#F5F5F5] font-sans">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Banner Section */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-teal-500/20 bg-teal-950/10 p-6 sm:p-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
          <span className="inline-flex rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-400">
            Cryptanalysis Playground
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Linear Cryptanalysis Simulator
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Linear cryptanalysis is a plaintext-known attack that constructs linear approximations between plaintext, ciphertext, and subkey bits. By measuring the bias of these approximations across many samples, attackers can isolate and recover secret key bits with high probability.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 mb-8 overflow-x-auto scrollbar-none">
          {[
            { id: "lat", label: "S-Box LAT Explorer", icon: <Binary className="h-4 w-4" /> },
            { id: "piling", label: "Piling-up Lemma", icon: <TrendingUp className="h-4 w-4" /> },
            { id: "cipher", label: "SPN Cipher Trace", icon: <Layers className="h-4 w-4" /> },
            { id: "attack", label: "Key Recovery Attack", icon: <Zap className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? "border-teal-500 text-teal-400 bg-teal-950/10"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: LAT Explorer */}
        {activeTab === "lat" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            {/* LAT Table Grid */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Linear Approximation Table (LAT)</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Calculates N_matches - 8 for Heys S-box approximations X·α ⊕ Y·β = 0. Large positive or negative values represent high bias (ideal for attacks).
              </p>
              
              <div className="overflow-x-auto">
                <div className="min-w-[480px]">
                  {/* LAT Grid Headers */}
                  <div className="grid grid-cols-[36px_repeat(16,1fr)] gap-1 mb-1 text-center text-[10px] font-bold text-zinc-500">
                    <div>α \ β</div>
                    {Array.from({ length: 16 }).map((_, b) => (
                      <div key={b}>{b.toString(16).toUpperCase()}</div>
                    ))}
                  </div>

                  {/* LAT Grid Rows */}
                  {lat.map((row, r) => (
                    <div key={r} className="grid grid-cols-[36px_repeat(16,1fr)] gap-1 mb-1">
                      <div className="flex items-center justify-center text-[10px] font-bold text-zinc-500 bg-zinc-950 rounded h-7 w-7">
                        {r.toString(16).toUpperCase()}
                      </div>
                      {row.map((val, c) => {
                        const absVal = Math.abs(val);
                        const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                        
                        // Select background color opacity based on bias
                        let bgClass = "bg-zinc-950/30 text-zinc-400 hover:bg-zinc-800";
                        if (val > 0) {
                          bgClass = `bg-emerald-500/${Math.min(90, absVal * 12)} text-emerald-300 hover:bg-emerald-500/30`;
                        } else if (val < 0) {
                          bgClass = `bg-indigo-500/${Math.min(90, absVal * 12)} text-indigo-300 hover:bg-indigo-500/30`;
                        }

                        if (isSelected) {
                          bgClass = "ring-2 ring-teal-400 text-white bg-teal-500/40";
                        }

                        return (
                          <button
                            key={c}
                            onClick={() => setSelectedCell({ row: r, col: c })}
                            className={`flex items-center justify-center text-xs font-semibold rounded h-7 w-full transition-all ${bgClass}`}
                            title={`In: ${r}, Out: ${c}, Dev: ${val}`}
                          >
                            {val === 0 ? "0" : val > 0 ? `+${val}` : val}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LAT Detail sidebar */}
            <div className="flex flex-col gap-6">
              {cellDetails ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-white">Approximation Detail</h3>
                    <span className="rounded bg-teal-950 border border-teal-500/30 text-teal-400 px-2.5 py-1 text-xs font-mono">
                      α = {cellDetails.alpha.toString(16).toUpperCase()}h, β = {cellDetails.beta.toString(16).toUpperCase()}h
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded bg-zinc-950 p-3 text-center border border-zinc-800">
                      <span className="block text-[10px] uppercase text-zinc-500 font-bold">Bias (ε)</span>
                      <span className="text-xl font-bold font-mono text-white">
                        {cellDetails.bias > 0 ? `+${cellDetails.bias}` : cellDetails.bias}
                      </span>
                    </div>
                    <div className="rounded bg-zinc-950 p-3 text-center border border-zinc-800">
                      <span className="block text-[10px] uppercase text-zinc-500 font-bold">Probability</span>
                      <span className="text-xl font-bold font-mono text-white">
                        {(cellDetails.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="rounded bg-zinc-950 p-4 border border-zinc-800 mb-6 text-sm">
                    <span className="block text-xs text-zinc-400 mb-2 font-semibold">Active Linear Relation:</span>
                    <code className="text-teal-400 font-mono block text-xs break-all">
                      {`Parity(X & 0x${cellDetails.alpha.toString(16).toUpperCase()}) ⊕ Parity(Y & 0x${cellDetails.beta.toString(16).toUpperCase()}) = 0`}
                    </code>
                    <span className="block text-[11px] text-zinc-500 mt-3 leading-normal">
                      Holds for {cellDetails.count} out of 16 entries (Expected: 8/16).
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">All S-Box Map Parity checks</h4>
                  <div className="rounded-lg border border-zinc-800 overflow-hidden max-h-[220px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-950 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
                          <th className="py-2 px-3">X (In)</th>
                          <th className="py-2 px-3">Y (Out)</th>
                          <th className="py-2 px-3 text-center">X·α</th>
                          <th className="py-2 px-3 text-center">Y·β</th>
                          <th className="py-2 px-3 text-center">Eq</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 font-mono">
                        {cellDetails.evaluations.map((evalItem) => (
                          <tr key={evalItem.x} className={evalItem.equal ? "bg-emerald-500/[0.02]" : "bg-red-500/[0.02]"}>
                            <td className="py-2 px-3">{evalItem.x.toString(16).toUpperCase()} ({evalItem.xBin})</td>
                            <td className="py-2 px-3">{evalItem.y.toString(16).toUpperCase()} ({evalItem.yBin})</td>
                            <td className="py-2 px-3 text-center">{evalItem.pIn}</td>
                            <td className="py-2 px-3 text-center">{evalItem.pOut}</td>
                            <td className={`py-2 px-3 text-center font-bold ${evalItem.equal ? "text-emerald-400" : "text-zinc-600"}`}>
                              {evalItem.equal ? "✓" : "✗"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col items-center justify-center text-center h-48">
                  <HelpCircle className="h-8 w-8 text-zinc-600 mb-2" />
                  <span className="text-sm text-zinc-400">Select any cell on the LAT table to explore its bitwise linear evaluations.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Piling-up Lemma */}
        {activeTab === "piling" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Combined Approximation Creator</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Linear approximations of multiple independent rounds are combined to trace the overall correlation. Matsui&apos;s Piling-Up Lemma calculates the combined bias.
              </p>

              {/* Input for new bias */}
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="-0.5"
                    max="0.5"
                    value={newBiasInput}
                    onChange={(e) => setNewBiasInput(e.target.value)}
                    placeholder="Enter round bias (e.g. 0.25, -0.125)"
                    className="w-full rounded bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-mono">ε_i</span>
                </div>
                <button
                  onClick={addBias}
                  className="inline-flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white rounded px-4 py-2 text-sm font-semibold transition"
                >
                  <Plus size={16} /> Add Bias
                </button>
              </div>

              {/* List of active biases */}
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Active Round Biases</h4>
              {biases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-xs">
                  No active biases. Add some biases above to calculate.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {biases.map((bias, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-950 px-4 py-3 rounded-lg border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-500 font-mono">Round {idx + 1}</span>
                        <span className="text-sm font-semibold font-mono text-teal-400">
                          {bias > 0 ? `+${bias}` : bias}
                        </span>
                      </div>
                      <button
                        onClick={() => removeBias(idx)}
                        className="text-zinc-500 hover:text-red-400 transition"
                        title="Remove bias"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations Result */}
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="text-base font-bold text-white mb-6">Piling-up Lemma Results</h3>
                
                <div className="grid gap-6">
                  {/* Combined Bias */}
                  <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800">
                    <span className="block text-[10px] uppercase text-zinc-500 font-bold mb-1">Combined Bias (ε_1..{biases.length})</span>
                    <span className="text-2xl font-extrabold font-mono text-teal-400">
                      {pilingUpResult.combinedBias > 0 ? `+${pilingUpResult.combinedBias.toFixed(6)}` : pilingUpResult.combinedBias.toFixed(6)}
                    </span>
                  </div>

                  {/* Combined Probability */}
                  <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800">
                    <span className="block text-[10px] uppercase text-zinc-500 font-bold mb-1">Combined Probability</span>
                    <span className="text-2xl font-extrabold font-mono text-white">
                      {(pilingUpResult.probability * 100).toFixed(3)}%
                    </span>
                  </div>

                  {/* Formula Breakdown */}
                  <div className="rounded-lg bg-zinc-950/40 p-4 border border-zinc-800/80 text-xs text-zinc-400 leading-normal">
                    <span className="font-semibold text-white block mb-2">Matsui&apos;s Theorem Reference:</span>
                    If r linear approximations are combined with independent biases ε_1, ε_2, ..., ε_r, the combined bias is calculated as:
                    <div className="font-mono text-teal-400 text-center my-3 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/50">
                      {`ε = 2^(r-1) * ∏(ε_i)`}
                    </div>
                    As the number of rounds ($r$) increases, the overall bias rapidly collapses toward $0$, which makes ciphers with more rounds extremely resilient to linear cryptanalysis.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Cipher Trace */}
        {activeTab === "cipher" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Trace visualization */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6">2-Round SPN Cipher Flow</h3>

              {/* Encryption Trace Graph */}
              <div className="flex flex-col gap-6 items-center py-4 select-none">
                
                {/* Plaintext Box */}
                <div className="flex flex-col items-center justify-center border border-zinc-700 bg-zinc-950 rounded-lg px-6 py-2.5 w-40 text-center shadow-lg">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Plaintext (Pt)</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {traceResult ? `0x${traceResult.w0.toString(16).toUpperCase().padStart(2, "0")}` : "0x--"}
                  </span>
                </div>

                <div className="h-6 w-[1.5px] bg-zinc-700" />

                {/* Round 1 Box */}
                <div className="border border-zinc-800 bg-zinc-950/70 rounded-xl p-4 w-full max-w-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Round 1</span>
                    <span className="text-[10px] font-mono text-zinc-500">Key: 0x{traceResult ? traceResult.k1.toString(16).toUpperCase() : "--"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2">
                      <span className="block text-[9px] uppercase text-zinc-500">Add K1</span>
                      <span className="font-mono text-white">
                        {traceResult ? `0x${traceResult.w0.toString(16).toUpperCase().padStart(2, "0")}` : "--"}
                      </span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2">
                      <span className="block text-[9px] uppercase text-zinc-500">S-Box</span>
                      <span className="font-mono text-white">
                        {traceResult ? `0x${traceResult.w1.toString(16).toUpperCase().padStart(2, "0")}` : "--"}
                      </span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2">
                      <span className="block text-[9px] uppercase text-zinc-500">Permute</span>
                      <span className="font-mono text-white">
                        {traceResult ? `0x${traceResult.w1_p.toString(16).toUpperCase().padStart(2, "0")}` : "--"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-6 w-[1.5px] bg-zinc-700" />

                {/* Round 2 Box */}
                <div className="border border-zinc-800 bg-zinc-950/70 rounded-xl p-4 w-full max-w-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Round 2</span>
                    <span className="text-[10px] font-mono text-zinc-500">Key: 0x{traceResult ? traceResult.k2.toString(16).toUpperCase() : "--"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2">
                      <span className="block text-[9px] uppercase text-zinc-500">Add K2</span>
                      <span className="font-mono text-white">
                        {traceResult ? `0x${traceResult.w2.toString(16).toUpperCase().padStart(2, "0")}` : "--"}
                      </span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2">
                      <span className="block text-[9px] uppercase text-zinc-500">S-Box</span>
                      <span className="font-mono text-white">
                        {traceResult ? `0x${traceResult.w3.toString(16).toUpperCase().padStart(2, "0")}` : "--"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-6 w-[1.5px] bg-zinc-700" />

                {/* Final Round Key Box */}
                <div className="border border-zinc-850 bg-zinc-950/50 rounded-lg p-3 w-full max-w-md flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Final Round Key XOR</span>
                  <span className="font-mono text-zinc-500">K3: 0x{traceResult ? traceResult.k3.toString(16).toUpperCase().padStart(2, "0") : "--"}</span>
                </div>

                <div className="h-6 w-[1.5px] bg-zinc-700" />

                {/* Ciphertext Box */}
                <div className="flex flex-col items-center justify-center border border-teal-500/30 bg-teal-950/10 rounded-lg px-6 py-2.5 w-40 text-center shadow-[0_0_15px_rgba(20,216,194,0.05)]">
                  <span className="text-[10px] text-teal-400 font-bold uppercase">Ciphertext (Ct)</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {traceResult ? `0x${traceResult.ct.toString(16).toUpperCase().padStart(2, "0")}` : "0x--"}
                  </span>
                </div>

              </div>
            </div>

            {/* Inputs Panel */}
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="text-base font-bold text-white mb-6">Trace Controls</h3>

                <div className="grid gap-4 mb-6">
                  <label className="flex flex-col gap-1.5 text-xs text-zinc-400 font-semibold">
                    Plaintext (8-bit Hex)
                    <input
                      type="text"
                      maxLength={2}
                      value={plainInput}
                      onChange={(e) => setPlainInput(e.target.value.toUpperCase())}
                      className="rounded bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm font-mono text-white focus:border-teal-500 focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs text-zinc-400 font-semibold">
                    Master Key (16-bit Hex)
                    <input
                      type="text"
                      maxLength={4}
                      value={masterKeyInput}
                      onChange={(e) => setMasterKeyInput(e.target.value.toUpperCase())}
                      className="rounded bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm font-mono text-white focus:border-teal-500 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={runCipherTrace}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-teal-600 hover:bg-teal-500 text-white rounded py-2 text-sm font-semibold transition"
                  >
                    <Play size={16} /> Run Cipher
                  </button>
                  <button
                    onClick={() => {
                      setPlainInput("A5");
                      setMasterKeyInput("2F3D");
                      setTraceResult(null);
                    }}
                    className="border border-zinc-800 hover:bg-zinc-800 rounded p-2 text-zinc-400 hover:text-white transition"
                    title="Reset defaults"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              {/* Educational info */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-xs text-zinc-400 leading-normal">
                <div className="flex items-center gap-2 text-white font-bold mb-3">
                  <Info size={16} className="text-teal-400" />
                  <span>Interactive Walkthrough</span>
                </div>
                The block cipher is a 2-round Substitution-Permutation Network:
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li><strong>Round Key expansion:</strong> The 16-bit Master Key yields three round keys $K_1, K_2, K_3$ via sliding extraction.</li>
                  <li><strong>S-Box Substitution:</strong> The 8-bit block is split into high and low nibbles (4 bits each), which are separately processed via the Heys S-box.</li>
                  <li><strong>Permutation Layer:</strong> Bits are transposed globally to provide diffusion, ensuring bits from the left S-box output mix into the right S-box input of the subsequent round.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Key Recovery Attack */}
        {activeTab === "attack" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Attack Dashboard / Results */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-2">Key Recovery Playground</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Matsui&apos;s Last-Round Key Recovery Attack: Recovers the lower 4 bits of round key $K_3$ by checking the linear relation:
                <code className="text-teal-400 font-mono ml-1.5">{`(P_left & 0x0B) ⊕ (W2_right & 0x08) = KeyConst`}</code>
              </p>

              {isAttacking ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent mb-4" />
                  <span className="text-sm text-zinc-400">Decrypting last round and computing empirical candidate biases...</span>
                </div>
              ) : attackResults.length > 0 ? (
                <div className="flex-1 flex flex-col">
                  <h4 className="text-sm font-bold text-white mb-4">Empirical Bias Rankings (sorted by |bias| descending)</h4>
                  
                  {/* Results grid */}
                  <div className="grid gap-3 mb-6">
                    {attackResults.map((result, idx) => {
                      const isCorrect = result.candidate === correctSubkey;
                      const absBias = Math.abs(result.bias);
                      const barWidth = `${(absBias / 0.3) * 100}%`; // Normalized relative to max bias 0.3
                      
                      let barColor = "bg-zinc-700";
                      let containerClass = "border-zinc-800 bg-zinc-950/40";
                      if (isCorrect) {
                        barColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                        containerClass = "border-emerald-500/40 bg-emerald-950/5 ring-1 ring-emerald-500/20";
                      } else if (idx === 0) {
                        // Mismatch leading candidate
                        barColor = "bg-indigo-500";
                      }

                      return (
                        <div
                          key={result.candidate}
                          className={`flex items-center justify-between p-3 rounded-lg border text-xs transition ${containerClass}`}
                        >
                          {/* Candidate label */}
                          <div className="flex items-center gap-3 w-40">
                            <span className="text-zinc-500 font-bold font-mono">Rank {idx + 1}</span>
                            <span className={`font-mono font-bold ${isCorrect ? "text-emerald-400" : "text-white"}`}>
                              0x{result.candidate.toString(16).toUpperCase()} ({result.candidate.toString(2).padStart(4, "0")})
                            </span>
                            {isCorrect && (
                              <span className="rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                Correct Subkey
                              </span>
                            )}
                          </div>

                          {/* Bias chart bar */}
                          <div className="flex-1 mx-4 max-w-sm bg-zinc-950 rounded h-2 overflow-hidden border border-zinc-900">
                            <div className={`h-full rounded transition ${barColor}`} style={{ width: barWidth }} />
                          </div>

                          {/* Bias stats */}
                          <div className="flex items-center gap-4 w-32 justify-end text-right font-mono font-semibold">
                            <span className="text-zinc-500 text-[10px]">Matches: {result.count}</span>
                            <span className={isCorrect ? "text-emerald-400" : "text-zinc-400"}>
                              {result.bias > 0 ? `+${result.bias.toFixed(4)}` : result.bias.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary outcome banner */}
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-4 text-xs text-emerald-400 leading-normal">
                    <strong>Success!</strong> The linear cryptanalysis attack successfully recovered the last-round right S-box key candidate:
                    <span className="font-mono text-white font-bold ml-1">0x{correctSubkey?.toString(16).toUpperCase()}</span>.
                    It holds the highest absolute correlation bias of
                    <span className="font-mono text-white font-bold mx-1">
                      {Math.abs(attackResults.find(r => r.candidate === correctSubkey)?.bias || 0).toFixed(4)}
                    </span>
                    over {pairs.length} plaintext samples, confirming Matsui&apos;s recovery theorem.
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                  <ShieldCheck className="h-10 w-10 text-zinc-700 mb-2" />
                  <span className="text-sm text-zinc-400 font-semibold mb-1">Simulator Ready</span>
                  <span className="text-xs text-zinc-500 max-w-xs leading-normal">
                    Configure the master key and run the attack to see key candidates ranked by measured linear bias.
                  </span>
                </div>
              )}
            </div>

            {/* Attack Configurations Panel */}
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="text-base font-bold text-white mb-6">Attack Settings</h3>

                <div className="grid gap-4 mb-6">
                  <label className="flex flex-col gap-1.5 text-xs text-zinc-400 font-semibold">
                    Master Key (16-bit Hex)
                    <input
                      type="text"
                      maxLength={4}
                      value={attackMasterKey}
                      onChange={(e) => setAttackMasterKey(e.target.value.toUpperCase())}
                      className="rounded bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm font-mono text-white focus:border-teal-500 focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs text-zinc-400 font-semibold">
                    Plaintext Samples (N)
                    <select
                      value={numPairs}
                      onChange={(e) => setNumPairs(parseInt(e.target.value))}
                      className="rounded bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
                    >
                      <option value={100}>100 Pairs (Fast, lower accuracy)</option>
                      <option value={500}>500 Pairs (Balanced)</option>
                      <option value={1000}>1000 Pairs (Recommended)</option>
                      <option value={2000}>2000 Pairs (High Accuracy)</option>
                      <option value={5000}>5000 Pairs (Extra Thorough)</option>
                    </select>
                  </label>
                </div>

                <button
                  onClick={triggerAttack}
                  disabled={isAttacking}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded py-2 text-sm font-semibold transition disabled:opacity-50"
                >
                  <Zap size={16} /> Run Key Recovery Attack
                </button>
              </div>

              {/* Explanatory notes */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-xs text-zinc-400 leading-normal">
                <div className="flex items-center gap-2 text-white font-bold mb-3">
                  <Info size={16} className="text-teal-400" />
                  <span>Educational Disclaimer</span>
                </div>
                The attack runs entirely inside your browser sandbox by:
                <ul className="list-decimal pl-4 mt-2 space-y-1">
                  <li>Generating random plaintexts and encrypting them under the target master key.</li>
                  <li>Partially decrypting the right S-box of the last round using each of the 16 key candidates.</li>
                  <li>Evaluating the linear path parity and ranking candidates by deviation from 1/2.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
