'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Zap,
  ArrowRight,
  Database,
  Layers,
  Lock,
  Coins,
  RefreshCw,
  FileCheck,
  Key,
  Shield,
  Fingerprint,
  Info,
  Server,
  Activity,
} from 'lucide-react';
import {
  DomainOperationCategory,
  DomainOperationState,
  DomainOperationResult,
  validateDomainInput,
  globalIdempotencyStore,
  TerminalErrorState,
  PrimaryOperationState,
} from '@/lib/domain/domainOperationState';
import {
  signToken,
  verifyToken,
  executePrivilegedOperation,
  getAuditLogs,
  clearAuditLogs,
  resetRateLimits,
  AuditLogEntry,
  TrustedSession,
} from '@/lib/domain/serverBoundary';

const CATEGORIES: { id: DomainOperationCategory; label: string; description: string }[] = [
  { id: 'arbitrage', label: 'Flash-Loan / Arbitrage', description: 'Cross-DEX atomic arbitrage execution' },
  { id: 'bridge', label: 'Cross-Chain Bridge', description: 'Multi-chain asset relay and lock-and-mint' },
  { id: 'custody', label: 'Custody Withdrawal', description: 'Institutional multi-sig vault withdrawal' },
  { id: 'rwa', label: 'RWA Proof-of-Reserve', description: 'Real-World Asset oracle reserve attestation' },
  { id: 'yield', label: 'Yield Distribution', description: 'DeFi vault yield settlement and payout' },
  { id: 'validator', label: 'Validator Rewards', description: 'Staking validator reward distribution' },
];

export default function DomainOperationVisualizer() {
  const [selectedCategory, setSelectedCategory] = useState<DomainOperationCategory>('arbitrage');
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'user' | 'guest'>('admin');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('idempotency-key-001');
  const [simulateFailure, setSimulateFailure] = useState<TerminalErrorState | 'NONE'>('NONE');
  const [omitEvidence, setOmitEvidence] = useState<boolean>(false);

  // Server security boundary state
  const [sessionToken, setSessionToken] = useState<string>('');
  const [csrfToken] = useState<string>('csrf_cryptoviz_secret_9988');
  const [sentToken, setSentToken] = useState<string>('');
  const [sentCsrfToken, setSentCsrfToken] = useState<string>('csrf-secret-key-xyz-789');
  const [correlationId, setCorrelationId] = useState<string>('');
  const [auditLogsList, setAuditLogsList] = useState<AuditLogEntry[]>([]);

  // Simulation execution state
  const [loading, setLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<DomainOperationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security gate checks trace
  const [gates, setGates] = useState<{
    csrf: 'idle' | 'running' | 'passed' | 'failed';
    signature: 'idle' | 'running' | 'passed' | 'failed';
    rateLimit: 'idle' | 'running' | 'passed' | 'failed';
    validation: 'idle' | 'running' | 'passed' | 'failed';
    rbac: 'idle' | 'running' | 'passed' | 'failed';
    execution: 'idle' | 'running' | 'passed' | 'failed';
  }>({
    csrf: 'idle',
    signature: 'idle',
    rateLimit: 'idle',
    validation: 'idle',
    rbac: 'idle',
    execution: 'idle',
  });

  // Automatically request session token from boundary when role/category changes
  const handleRequestToken = (role: 'admin' | 'operator' | 'user' | 'guest') => {
    const session: TrustedSession = {
      userId: `usr_${role}_${Math.floor(Math.random() * 900 + 100)}`,
      role,
      permissions:
        role === 'admin'
          ? ['*']
          : role === 'operator'
          ? [`domain:${selectedCategory}:write`]
          : [],
      expiry: Date.now() + 300000, // 5 minutes validity
      csrfToken: csrfToken,
    };
    const token = signToken(session);
    setSessionToken(token);
    setSentToken(token);
    setSentCsrfToken(csrfToken);
    setErrorMsg(null);
  };

  const refreshAuditLogs = async () => {
    try {
      const logs = await getAuditLogs();
      setAuditLogsList(logs);
    } catch {}
  };

  useEffect(() => {
    handleRequestToken(userRole);
    refreshAuditLogs();
  }, [userRole, selectedCategory]);

  const getPayloadForCategory = (cat: DomainOperationCategory) => {
    switch (cat) {
      case 'arbitrage':
        return { amountEth: 50, dexA: 'Uniswap_v3', dexB: 'Sushiswap', minProfitEth: 0.45 };
      case 'bridge':
        return { sourceChain: 'Ethereum', targetChain: 'Arbitrum', amount: 10, token: 'USDC' };
      case 'custody':
        return { asset: 'BTC', amount: 2.5, destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' };
      case 'rwa':
        return { assetId: 'rwa_gold_vault_01', custodian: 'Paxos', expectedReserveUsd: 15000000 };
      case 'yield':
        return { poolId: 'steth_yield_pool', totalDistributionUsd: 250000 };
      case 'validator':
        return { validatorAddress: '0x89205A3A3b2A69De6Dbf7f01EDf3010b57f48300', rewardAmountGwei: 450000000 };
    }
  };

  const handleRunOperation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setCurrentResult(null);

    const corrId = `req_corr_${Math.random().toString(36).substring(2, 10)}`;
    setCorrelationId(corrId);

    // Initialize check visual statuses
    setGates({
      csrf: 'running',
      signature: 'idle',
      rateLimit: 'idle',
      validation: 'idle',
      rbac: 'idle',
      execution: 'idle',
    });

    const payload = getPayloadForCategory(selectedCategory);
    const input = {
      category: selectedCategory,
      operationName: `Execute ${selectedCategory.toUpperCase()} Operation`,
      payload,
      idempotencyKey,
      isSimulation: isSimulationMode,
    };

    // Stage 1: CSRF check
    await new Promise((r) => setTimeout(r, 450));
    let csrfPassed = false;
    try {
      const parts = sentToken.split('.');
      if (parts.length === 2) {
        const payloadStr = decodeURIComponent(escape(atob(parts[0])));
        const sessionObj: TrustedSession = JSON.parse(payloadStr);
        csrfPassed = sessionObj.csrfToken === sentCsrfToken;
      }
    } catch {}

    if (!csrfPassed) {
      setGates((g) => ({ ...g, csrf: 'failed' }));
      setErrorMsg('CSRF_MISMATCH: Mismatching or missing CSRF token.');
      setLoading(false);
      executePrivilegedOperation(input, sentToken, sentCsrfToken, corrId).then(() => {
        refreshAuditLogs();
      });
      return;
    }
    setGates((g) => ({ ...g, csrf: 'passed', signature: 'running' }));

    // Stage 2: Signature check
    await new Promise((r) => setTimeout(r, 450));
    let sigPassed = false;
    let decodedSession: TrustedSession | null = null;
    try {
      decodedSession = verifyToken(sentToken);
      sigPassed = true;
    } catch {}

    if (!sigPassed || !decodedSession) {
      setGates((g) => ({ ...g, signature: 'failed' }));
      setErrorMsg('INVALID_SIGNATURE: Token signature verification failed.');
      setLoading(false);
      executePrivilegedOperation(input, sentToken, sentCsrfToken, corrId).then(() => {
        refreshAuditLogs();
      });
      return;
    }
    setGates((g) => ({ ...g, signature: 'passed', rateLimit: 'running' }));

    // Stage 3: Rate Limiting
    await new Promise((r) => setTimeout(r, 450));
    setGates((g) => ({ ...g, rateLimit: 'passed', validation: 'running' }));

    // Stage 4: Input Validation
    await new Promise((r) => setTimeout(r, 450));
    const valCheck = validateDomainInput(input);
    if (!valCheck.isValid) {
      setGates((g) => ({ ...g, validation: 'failed' }));
      setErrorMsg(valCheck.error || 'Validation failed');
      setLoading(false);
      executePrivilegedOperation(input, sentToken, sentCsrfToken, corrId).then(() => {
        refreshAuditLogs();
      });
      return;
    }
    setGates((g) => ({ ...g, validation: 'passed', rbac: 'running' }));

    // Stage 5 & 6: RBAC and Service Execution
    await new Promise((r) => setTimeout(r, 450));

    try {
      const response = await executePrivilegedOperation(input, sentToken, sentCsrfToken, corrId);

      if (response.success && response.result) {
        setGates((g) => ({ ...g, rbac: 'passed', execution: 'passed' }));
        setCurrentResult(response.result);
      } else {
        const err = response.error || 'Server Execution Failed';
        if (err.includes('Insufficient privileges') || err.includes('role')) {
          setGates((g) => ({ ...g, rbac: 'failed', execution: 'idle' }));
        } else if (err.includes('RATE_LIMIT')) {
          setGates((g) => ({ ...g, rateLimit: 'failed', validation: 'passed', rbac: 'idle' }));
        } else {
          setGates((g) => ({ ...g, rbac: 'passed', execution: 'failed' }));
        }
        throw new Error(err);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      await refreshAuditLogs();
      setLoading(false);
    }
  };

  const handleClearIdempotency = async () => {
    await globalIdempotencyStore.clear();
    setCurrentResult(null);
    setErrorMsg(null);
  };

  const handleResetLimits = async () => {
    resetRateLimits();
    await refreshAuditLogs();
    setErrorMsg(null);
  };

  const handleClearLogs = async () => {
    await clearAuditLogs();
    setAuditLogsList([]);
  };

  // Tampering actions
  const tamperSignature = () => {
    if (!sentToken) return;
    const parts = sentToken.split('.');
    if (parts.length === 2) {
      const alteredSig = parts[1].replace(/.$/, '0'); // Alter last hex char
      setSentToken(`${parts[0]}.${alteredSig}`);
    }
  };

  const tamperCsrfToken = () => {
    setSentCsrfToken('csrf_malicious_token_forged_value');
  };

  const tamperExpiry = () => {
    const expiredSession: TrustedSession = {
      userId: `usr_${userRole}_expired`,
      role: userRole,
      permissions: userRole === 'admin' ? ['*'] : [],
      expiry: Date.now() - 3600000, // Expired 1 hour ago
      csrfToken: csrfToken,
    };
    setSentToken(signToken(expiredSession));
  };

  const getGateBadge = (status: 'idle' | 'running' | 'passed' | 'failed') => {
    switch (status) {
      case 'idle':
        return <span className="text-zinc-600 font-mono text-xs">IDLE</span>;
      case 'running':
        return <span className="text-amber-500 font-mono text-xs animate-pulse">CHECKING...</span>;
      case 'passed':
        return <span className="text-emerald-400 font-mono text-xs font-bold">PASSED</span>;
      case 'failed':
        return <span className="text-red-500 font-mono text-xs font-bold">REJECTED</span>;
    }
  };

  const getGateBorder = (status: 'idle' | 'running' | 'passed' | 'failed') => {
    switch (status) {
      case 'idle':
        return 'border-zinc-800 bg-zinc-950/20';
      case 'running':
        return 'border-amber-500 bg-amber-950/10';
      case 'passed':
        return 'border-emerald-800 bg-emerald-950/10';
      case 'failed':
        return 'border-red-950 bg-red-950/10';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-6 bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Domain Operation State Engine
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              #1316 Server Boundary
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Enforces a secure, server-side policy layer using cryptographically signed session tokens, CSRF protection, rate limiting, and RBAC validation.
          </p>
        </div>

        {/* Simulation / Production Mode Toggle */}
        <div className="flex items-center gap-3 p-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
          <button
            onClick={() => setIsSimulationMode(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              !isSimulationMode
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Production Verified Mode
          </button>
          <button
            onClick={() => setIsSimulationMode(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              isSimulationMode
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Educational Simulation Mode
          </button>
        </div>
      </div>

      {/* Category Selection Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setCurrentResult(null);
              setErrorMsg(null);
            }}
            className={`p-3 rounded-lg text-left transition-all border ${
              selectedCategory === cat.id
                ? 'bg-teal-950/40 border-teal-500 text-white'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="text-xs font-semibold truncate">{cat.label}</div>
            <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{cat.description}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Client State & Control Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-teal-400" />
              1. Client / Browser Request State
            </h3>

            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-medium">1.1 Request User Role</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-teal-500"
              >
                <option value="admin">Admin (Full Rights)</option>
                <option value="operator">Operator (Category Rights)</option>
                <option value="user">User (Standard)</option>
                <option value="guest">Guest (Unauthorized)</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs text-zinc-400 font-medium">1.2 Authenticated Session Token (JWS / JWT-style)</label>
                <button
                  onClick={() => handleRequestToken(userRole)}
                  className="text-[10px] text-teal-400 hover:text-teal-300 font-bold"
                >
                  Regenerate Token
                </button>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded font-mono text-[10px] break-all leading-relaxed text-zinc-300 select-all max-h-24 overflow-y-auto">
                {sentToken || 'No token generated.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">1.3 CSRF Header Token</label>
                <input
                  type="text"
                  value={sentCsrfToken}
                  onChange={(e) => setSentCsrfToken(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono text-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">1.4 Idempotency Key</label>
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono text-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Simulated Failures */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-medium">1.5 Sim. Settlement Failure State</label>
              <select
                value={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-teal-500"
              >
                <option value="NONE">None (Happy Path)</option>
                <option value="REJECTED">REJECTED (Authorization/Validation)</option>
                <option value="FAILED">FAILED (Execution Error)</option>
                <option value="EXPIRED">EXPIRED (Pending Timeout)</option>
                <option value="CANCELLED">CANCELLED (User Abort)</option>
              </select>
            </div>

            {/* Tampering Switches */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <label className="block text-xs font-bold text-red-400">Security Tampering Demonstrations</label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={tamperSignature}
                  className="px-2 py-1 text-[10px] bg-red-950/20 text-red-300 border border-red-900/40 rounded hover:bg-red-950/40 font-semibold"
                >
                  Tamper Token Sig
                </button>
                <button
                  onClick={tamperCsrfToken}
                  className="px-2 py-1 text-[10px] bg-red-950/20 text-red-300 border border-red-900/40 rounded hover:bg-red-950/40 font-semibold"
                >
                  Tamper CSRF
                </button>
                <button
                  onClick={tamperExpiry}
                  className="px-2 py-1 text-[10px] bg-red-950/20 text-red-300 border border-red-900/40 rounded hover:bg-red-950/40 font-semibold"
                >
                  Expire Token
                </button>
              </div>
            </div>

            {/* Run Button */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleRunOperation}
                disabled={loading}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Submit request to API
              </button>
              <button
                onClick={handleClearIdempotency}
                title="Reset Idempotency Store"
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Server-Side Security Boundary Checkpoint Visualizer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                2. Server Security Boundary verification Pipeline
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleResetLimits}
                  className="text-[10px] text-zinc-400 hover:text-white border border-zinc-700 px-1.5 py-0.5 rounded"
                >
                  Reset Rate Limits
                </button>
              </div>
            </div>

            {correlationId && (
              <div className="flex justify-between bg-zinc-950/60 p-2 border border-zinc-800 rounded font-mono text-[10px] text-zinc-400">
                <span>Correlation ID: <span className="text-teal-400">{correlationId}</span></span>
                <span>Audit Status: <span className="text-emerald-400">LOGGED</span></span>
              </div>
            )}

            {/* Visual Gate Checklist */}
            <div className="space-y-2">
              {/* CSRF check */}
              <div className={`p-3 rounded border flex items-center justify-between transition-all duration-300 ${getGateBorder(gates.csrf)}`}>
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 ${gates.csrf === 'passed' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">2.1 CSRF Verification</div>
                    <div className="text-[10px] text-zinc-500">Compares request header token against parsed session payload token.</div>
                  </div>
                </div>
                {getGateBadge(gates.csrf)}
              </div>

              {/* Signature check */}
              <div className={`p-3 rounded border flex items-center justify-between transition-all duration-300 ${getGateBorder(gates.signature)}`}>
                <div className="flex items-center gap-3">
                  <Key className={`w-4 h-4 ${gates.signature === 'passed' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">2.2 Cryptographic JWS Signature Check (HMAC-SHA256)</div>
                    <div className="text-[10px] text-zinc-500">Verifies payload integrity using server-only secret and token expiry.</div>
                  </div>
                </div>
                {getGateBadge(gates.signature)}
              </div>

              {/* Rate limit check */}
              <div className={`p-3 rounded border flex items-center justify-between transition-all duration-300 ${getGateBorder(gates.rateLimit)}`}>
                <div className="flex items-center gap-3">
                  <Activity className={`w-4 h-4 ${gates.rateLimit === 'passed' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">2.3 In-Memory Rate Limiter Guard</div>
                    <div className="text-[10px] text-zinc-500">Enforces request quotas on user level (limit of 5 requests per 10s).</div>
                  </div>
                </div>
                {getGateBadge(gates.rateLimit)}
              </div>

              {/* Input validation check */}
              <div className={`p-3 rounded border flex items-center justify-between transition-all duration-300 ${getGateBorder(gates.validation)}`}>
                <div className="flex items-center gap-3">
                  <FileCheck className={`w-4 h-4 ${gates.validation === 'passed' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">2.4 Server-Side Domain Input Validation</div>
                    <div className="text-[10px] text-zinc-500">Sanitizes payload parameters to reject invalid amounts, accounts, or inputs.</div>
                  </div>
                </div>
                {getGateBadge(gates.validation)}
              </div>

              {/* RBAC check */}
              <div className={`p-3 rounded border flex items-center justify-between transition-all duration-300 ${getGateBorder(gates.rbac)}`}>
                <div className="flex items-center gap-3">
                  <Shield className={`w-4 h-4 ${gates.rbac === 'passed' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">2.5 Role-Based Access Control / Policies</div>
                    <div className="text-[10px] text-zinc-500">Verifies user permissions derived from session token for privileged actions.</div>
                  </div>
                </div>
                {getGateBadge(gates.rbac)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* State Machine Transition Pipeline */}
      <div className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-800 space-y-3">
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          State Transition Pipeline Lifecycle (Core Domain service)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {(['REQUESTED', 'VALIDATING', 'SUBMITTED_PENDING', 'EXTERNALLY_VERIFIED', 'PERSISTED', 'COMPLETED'] as PrimaryOperationState[]).map(
            (s, idx) => {
              const isActive = currentResult?.state === s;
              const isPast =
                currentResult &&
                currentResult.stateHistory.some((h) => h.state === s);

              return (
                <div
                  key={s}
                  className={`p-3 rounded-lg border flex flex-col items-center text-center transition-all ${
                    isActive
                      ? 'bg-teal-950/60 border-teal-500 text-teal-300 shadow-md shadow-teal-950'
                      : isPast
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                  }`}
                >
                  <div className="text-[10px] text-zinc-500 mb-1 font-mono">Stage 0{idx + 1}</div>
                  <div className="text-xs font-bold font-mono">{s}</div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Error Message display */}
      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-lg flex items-center gap-3 text-red-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Result Display */}
      {currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Operation Status & State History */}
          <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Execution Outcome</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  currentResult.state === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : currentResult.state === 'REJECTED' || currentResult.state === 'FAILED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {currentResult.state}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Operation ID:</span>
                <span className="text-zinc-200">{currentResult.id}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Idempotency Key:</span>
                <span className="text-zinc-200">{currentResult.idempotencyKey}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Mode:</span>
                <span className={currentResult.isSimulation ? 'text-amber-400' : 'text-emerald-400'}>
                  {currentResult.isSimulation ? 'Educational Simulation (simulation-*)' : 'Production Verified'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Durable Persisted:</span>
                <span className="text-zinc-200">{currentResult.durablePersisted ? 'TRUE' : 'FALSE'}</span>
              </div>
            </div>

            {currentResult.error && (
              <div className="p-2.5 bg-red-950/30 border border-red-900 rounded text-red-300 text-xs">
                <strong>Error Cause:</strong> {currentResult.error}
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800">
              <div className="text-[11px] font-semibold text-zinc-400 mb-2">State History Audit Trail</div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {currentResult.stateHistory.map((h, i) => (
                  <div key={i} className="text-[11px] font-mono flex items-center justify-between text-zinc-400">
                    <span className="text-teal-400">{h.state}</span>
                    <span className="text-zinc-500 text-[10px]">{h.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cryptographic Evidence & Attestation Inspector */}
          <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Verified Evidence & Receipts</span>
              <FileCheck className="w-4 h-4 text-teal-400" />
            </div>

            {currentResult.evidence ? (
              <div className="space-y-2 text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-800 overflow-x-auto">
                {currentResult.evidence.txHash && (
                  <div>
                    <span className="text-zinc-500">Transaction Hash: </span>
                    <span className="text-emerald-400">{currentResult.evidence.txHash}</span>
                  </div>
                )}
                {currentResult.evidence.sourceChainTx && (
                  <div>
                    <span className="text-zinc-500">Source Chain Tx: </span>
                    <span className="text-emerald-400">{currentResult.evidence.sourceChainTx}</span>
                  </div>
                )}
                {currentResult.evidence.targetChainTx && (
                  <div>
                    <span className="text-zinc-500">Target Chain Tx: </span>
                    <span className="text-emerald-400">{currentResult.evidence.targetChainTx}</span>
                  </div>
                )}
                {currentResult.evidence.oracleAttestationHash && (
                  <div>
                    <span className="text-zinc-500">Oracle Attestation: </span>
                    <span className="text-emerald-400">{currentResult.evidence.oracleAttestationHash}</span>
                  </div>
                )}
                {currentResult.evidence.proofOfReserveProof && (
                  <div>
                    <span className="text-zinc-500">Proof-of-Reserve: </span>
                    <span className="text-emerald-400">{currentResult.evidence.proofOfReserveProof}</span>
                  </div>
                )}
                {currentResult.evidence.settlementTxHash && (
                  <div>
                    <span className="text-zinc-500">Settlement Tx: </span>
                    <span className="text-emerald-400">{currentResult.evidence.settlementTxHash}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-zinc-950 rounded border border-zinc-800 text-center text-zinc-500 text-xs">
                No external evidence recorded for this state.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Server Audit Log View */}
      <div className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-800 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" />
            3. Server Audit Logs (Stored on security boundary)
          </span>
          <button
            onClick={handleClearLogs}
            className="text-[10px] text-zinc-400 hover:text-white border border-zinc-700 px-1.5 py-0.5 rounded"
          >
            Clear Audit Trail
          </button>
        </div>

        {auditLogsList.length > 0 ? (
          <div className="overflow-x-auto max-h-60 rounded border border-zinc-800 bg-zinc-950">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-850">
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Correlation ID</th>
                  <th className="p-2">User ID (Role)</th>
                  <th className="p-2">Operation</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {auditLogsList.map((log, index) => (
                  <tr key={index} className="hover:bg-zinc-900/30">
                    <td className="p-2 whitespace-nowrap text-zinc-500 text-[10px]">{log.timestamp.slice(11, 19)}</td>
                    <td className="p-2 text-teal-400">{log.correlationId}</td>
                    <td className="p-2">
                      <span className="text-zinc-200">{log.userId}</span>{' '}
                      <span className="text-[10px] text-zinc-500 font-bold">({log.role})</span>
                    </td>
                    <td className="p-2 font-semibold">{log.category}</td>
                    <td className="p-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-2 text-zinc-400 text-[10px] max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-zinc-950 rounded border border-zinc-850 text-center text-zinc-500 text-xs">
            Audit logs are currently empty. Submit requests to populate the trail.
          </div>
        )}
      </div>
    </div>
  );
}
