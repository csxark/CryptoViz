'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Shield,
  Lock,
  Key,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  BookOpen,
  RefreshCw,
  Zap,
  ShoppingBag,
  DollarSign,
  Cpu,
  ShieldAlert,
  Sliders,
  Check,
} from 'lucide-react';
import {
  EMVCardData,
  EMVTerminalData,
  EMVTransactionSummary,
  executeEMVTransaction,
  computeKeyHierarchy,
  generateApplicationCryptogram,
  runEMVFraudSimulation,
  amountToBCDHex,
  CardAuthMethod,
} from '@/lib/emv/emvEngine';

const PRESETS: { name: string; card: EMVCardData; terminal: EMVTerminalData }[] = [
  {
    name: 'Visa Credit DDA ($49.99 USD)',
    card: {
      pan: '4532015899123456',
      psn: '01',
      cardholderName: 'ALEX VANCE',
      expiryDate: '2812',
      issuerMasterKeyHex: '0123456789ABCDEF0123456789ABCDEF',
      cardAuthenticationMethod: 'DDA',
    },
    terminal: {
      terminalId: 'POS-METRO-401',
      merchantName: 'Metro Coffee Shop',
      amount: 49.99,
      currencyCode: '0840',
      countryCode: '0840',
      unpredictableNumberHex: '8A9B0C1D',
      transactionDate: '260807',
    },
  },
  {
    name: 'Mastercard Contactless CDA (€120.50 EUR)',
    card: {
      pan: '5412759900881234',
      psn: '00',
      cardholderName: 'SARAH MILLER',
      expiryDate: '2906',
      issuerMasterKeyHex: '9876543210FEDCBA9876543210FEDCBA',
      cardAuthenticationMethod: 'CDA',
    },
    terminal: {
      terminalId: 'POS-BERLIN-99',
      merchantName: 'Berlin Duty Free',
      amount: 120.5,
      currencyCode: '0978',
      countryCode: '0276',
      unpredictableNumberHex: '7F6E5D4C',
      transactionDate: '260807',
    },
  },
];

export default function EMVExplorer() {
  const [activeTab, setActiveTab] = useState<'pos' | 'cryptogram' | 'hierarchy' | 'fraud' | 'theory'>('pos');
  const [atcCounter, setAtcCounter] = useState<number>(142);
  const [attackMode, setAttackMode] = useState<'NONE' | 'REPLAY_ATTACK' | 'AMOUNT_FRAUD' | 'FORGED_CHIP_KEY'>('NONE');

  // Input states
  const [card, setCard] = useState<EMVCardData>(PRESETS[0].card);
  const [terminal, setTerminal] = useState<EMVTerminalData>(PRESETS[0].terminal);

  // Compute full EMV transaction execution summary
  const txSummary: EMVTransactionSummary = useMemo(() => {
    return executeEMVTransaction(card, terminal, atcCounter);
  }, [card, terminal, atcCounter]);

  // Compute Key Hierarchy details
  const keys = useMemo(() => {
    return computeKeyHierarchy(card.issuerMasterKeyHex, card.pan, card.psn, atcCounter);
  }, [card, atcCounter]);

  // Compute Fraud simulation results
  const fraudResult = useMemo(() => {
    return runEMVFraudSimulation(txSummary, attackMode);
  }, [txSummary, attackMode]);

  const handlePresetSelect = (p: (typeof PRESETS)[0]) => {
    setCard(p.card);
    setTerminal(p.terminal);
    setAttackMode('NONE');
  };

  const handleIncrementATC = () => {
    setAtcCounter(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-blue-950/50 via-zinc-900 to-indigo-950/50 border border-blue-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              EMVCo Specifications Books 1-4 Standard
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              EMV Payment Cryptography Explorer
            </h2>
            <p className="mt-2 text-zinc-300 max-w-3xl leading-relaxed text-sm sm:text-base">
              Demystify applied financial cryptography powering global chip-and-PIN payments. Explore <b>ARQC / ARPC dynamic cryptograms</b>, key diversification ($MK \rightarrow UDK \rightarrow SK$), and Issuer HSM online authorization.
            </p>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
            <span className="text-xs text-zinc-400 font-medium self-center">Presets:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSelect(p)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  card.pan === p.card.pan
                    ? 'bg-blue-500 text-zinc-950 font-bold border-blue-400 shadow-lg shadow-blue-500/20'
                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700/80 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 scrollbar-hide">
        {[
          { id: 'pos' as const, label: 'POS Terminal & Card Simulator', icon: ShoppingBag },
          { id: 'cryptogram' as const, label: 'ARQC / ARPC Cryptogram Inspector', icon: Lock },
          { id: 'hierarchy' as const, label: 'Key Derivation Hierarchy', icon: Sliders },
          { id: 'fraud' as const, label: 'POS Fraud & Security Sandbox', icon: ShieldAlert },
          { id: 'theory' as const, label: 'EMV Standards & HSM Theory', icon: BookOpen },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-500 text-white dark:text-zinc-950 dark:font-bold shadow-md shadow-blue-500/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: POS TERMINAL & CARD SIMULATOR */}
      {activeTab === 'pos' && (
        <div className="space-y-8">
          {/* Configurator Controls */}
          <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                Point-of-Sale (POS) & Chip Card Inputs
              </h3>
              <button
                onClick={handleIncrementATC}
                className="px-3 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Increment Card ATC ({atcCounter})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Transaction Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={terminal.amount}
                  onChange={e => setTerminal({ ...terminal, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Card Authentication Method
                </label>
                <select
                  value={card.cardAuthenticationMethod}
                  onChange={e => setCard({ ...card, cardAuthenticationMethod: e.target.value as CardAuthMethod })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="DDA">DDA (Dynamic Data Authentication)</option>
                  <option value="CDA">CDA (Combined DDA / Cryptogram)</option>
                  <option value="SDA">SDA (Static Data Authentication)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Primary Account Number (PAN)
                </label>
                <input
                  type="text"
                  value={card.pan}
                  onChange={e => setCard({ ...card, pan: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Terminal Unpredictable Number (UN)
                </label>
                <input
                  type="text"
                  value={terminal.unpredictableNumberHex}
                  onChange={e => setTerminal({ ...terminal, unpredictableNumberHex: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* EMV 7-Step Lifecycle Visualizer */}
          <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  EMV Transaction Lifecycle Trajectory
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Follow the 7 sequential stages from card chip insertion to online authorization and settlement cryptogram logging.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                ONLINE APPROVED (00)
              </div>
            </div>

            <div className="space-y-3">
              {txSummary.steps.map(s => (
                <div
                  key={s.stepNumber}
                  className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 font-extrabold text-xs shrink-0 mt-0.5">
                      {s.stepNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        {s.title}
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                          {s.actor}
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{s.description}</p>
                    </div>
                  </div>

                  {s.detailsHex && (
                    <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0">
                      {s.detailsHex}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ARQC / ARPC CRYPTOGRAM INSPECTOR */}
      {activeTab === 'cryptogram' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-500" />
              EMV Application Cryptograms Inspector
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Deep dive into the 3DES-MAC / AES-CMAC payload data structure used to derive dynamic cryptograms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-xs font-bold uppercase text-blue-500">1. ARQC (Card -&gt; Host)</span>
              <p className="text-sm text-zinc-300">Authorization Request Cryptogram generated by card for online approval.</p>
              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 font-mono text-xs text-blue-400 font-bold rounded-xl break-all">
                {txSummary.arqc.cryptogramHex}
              </div>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-xs font-bold uppercase text-indigo-400">2. ARPC (Host -&gt; Card)</span>
              <p className="text-sm text-zinc-300">Authorization Response Cryptogram generated by Bank HSM to authenticate host back to chip.</p>
              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 font-mono text-xs text-indigo-400 font-bold rounded-xl break-all">
                {txSummary.arpc.arpcHex}
              </div>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-xs font-bold uppercase text-emerald-400">3. TC (Settlement Proof)</span>
              <p className="text-sm text-zinc-300">Transaction Certificate generated by chip as proof of final settlement.</p>
              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 font-mono text-xs text-emerald-400 font-bold rounded-xl break-all">
                {txSummary.tc?.cryptogramHex}
              </div>
            </div>
          </div>

          <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <span className="text-xs font-bold uppercase text-blue-500">MAC Input Payload Data Block</span>
            <p className="font-mono text-xs break-all bg-zinc-100 dark:bg-zinc-900 p-3 rounded-xl text-zinc-300">
              {txSummary.arqc.inputDataBlockHex}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">Amount (BCD):</span>
                <span>{amountToBCDHex(terminal.amount)}</span>
              </div>
              <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">Country Code:</span>
                <span>{terminal.countryCode}</span>
              </div>
              <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">ATC Counter:</span>
                <span>00{atcCounter.toString(16).toUpperCase()}</span>
              </div>
              <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">Unpredictable No:</span>
                <span>{terminal.unpredictableNumberHex}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KEY DIVERSIFICATION HIERARCHY LAB */}
      {activeTab === 'hierarchy' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-500" />
              EMV Key Diversification Hierarchy ($MK \rightarrow UDK \rightarrow SK$)
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              To prevent a single card compromise from breaking the system, EMV uses 3 tiers of dynamic key derivation.
            </p>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Level 1 */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-amber-500 uppercase">Level 1: Issuer Master Key ($MK_{'{AC}'}$)</span>
              <p className="text-zinc-400">Stored inside bank Hardware Security Module (HSM).</p>
              <p className="text-zinc-200 bg-zinc-100 dark:bg-zinc-900 p-2 rounded break-all">{keys.issuerMasterKeyHex}</p>
            </div>

            <div className="flex justify-center text-zinc-500 font-bold text-xs">
              ↓ Diversified with PAN ({card.pan.slice(-8)}) + PSN ({card.psn})
            </div>

            {/* Level 2 */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-blue-400 uppercase">Level 2: Unique Card Key ($UDK_{'{AC}'}$)</span>
              <p className="text-zinc-400">Stored inside physical card chip silicon memory.</p>
              <p className="text-zinc-200 bg-zinc-100 dark:bg-zinc-900 p-2 rounded break-all">{keys.uniqueCardKeyHex}</p>
            </div>

            <div className="flex justify-center text-zinc-500 font-bold text-xs">
              ↓ Diversified per transaction with ATC ({keys.atcDiversificationData})
            </div>

            {/* Level 3 */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-emerald-400 uppercase">Level 3: Session Key ($SK_{'{AC}'}$)</span>
              <p className="text-zinc-400">Ephemeral key generated per transaction to compute ARQC.</p>
              <p className="text-zinc-200 bg-zinc-100 dark:bg-zinc-900 p-2 rounded break-all">{keys.sessionKeyHex}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: POS FRAUD & SECURITY SANDBOX */}
      {activeTab === 'fraud' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
              Payment Attack & Issuer HSM Verification Sandbox
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Simulate fraud attacks in payment networks (Replay attack, Modified transaction amount, or Counterfeit chip key) to observe Bank HSM cryptogram validation failure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'NONE' as const, label: '1. Valid Transaction', desc: 'Normal Payment Flow' },
              { id: 'REPLAY_ATTACK' as const, label: '2. Replay Attack', desc: 'Re-use previous ATC' },
              { id: 'AMOUNT_FRAUD' as const, label: '3. Amount Tampering', desc: 'POS alters $10 to $1,000' },
              { id: 'FORGED_CHIP_KEY' as const, label: '4. Forged Chip Key', desc: 'Cloned chip without MK' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setAttackMode(m.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  attackMode === m.id
                    ? 'bg-blue-500 text-zinc-950 border-blue-400 font-bold shadow-lg shadow-blue-500/20'
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="text-xs font-extrabold uppercase">{m.label}</div>
                <div className="text-xs text-zinc-500 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* HSM Validation Output */}
          <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h4 className="text-sm font-bold uppercase text-blue-600 dark:text-blue-400">
              Issuer Payment Host HSM Verification Status
            </h4>

            {!fraudResult.arqcVerified ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-bold text-rose-400">Transaction Declined by Issuer HSM</h5>
                  <p className="text-xs text-zinc-300 mt-1">{fraudResult.hsmStatusMessage}</p>
                  <p className="text-xs text-zinc-400 mt-2 font-mono">{fraudResult.details}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-bold text-emerald-400">Transaction Approved (00)</h5>
                  <p className="text-xs text-zinc-300 mt-1">{fraudResult.hsmStatusMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: THEORY & STANDARDS HUB */}
      {activeTab === 'theory' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              EMV Payment Security Standards Guide
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Maintained by EMVCo (Europay, Mastercard, Visa, JCB, Discover, UnionPay), EMV specifications govern point-of-sale chip card authentication worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-blue-400">1. ARQC vs Static Magnetic Stripes</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Magnetic stripe cards send static CVV data that can be cloned easily. EMV chip cards compute a unique <b>ARQC cryptogram per transaction</b> using an internal transaction counter (ATC) and terminal random number (UN), rendering cloned data useless.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-blue-400">2. Hardware Security Modules (HSMs)</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Issuer Master Keys ($MK_{'{AC}'}$) never exist in general computer memory. They are stored inside tamper-resistant Hardware Security Modules (HSMs) in bank data centers that perform ARQC validation and ARPC generation under strict PCI-DSS rules.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-blue-400">3. Contactless Tokenization (Apple Pay / Google Pay)</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Mobile contactless payments replace the real 16-digit PAN with a Device Account Number (Token) and generate dynamic cryptograms over NFC, keeping real account numbers invisible to merchants.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-blue-400">4. Offline Authentication (DDA & CDA)</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Dynamic Data Authentication (DDA) uses RSA asymmetric signatures signed by the chip card. Combined DDA (CDA) signs the ARQC payload directly to prevent man-in-the-middle terminal manipulation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
