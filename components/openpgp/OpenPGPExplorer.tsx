'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Lock,
  Key,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  Zap,
  BarChart3,
  FileSearch,
  BookOpen,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import {
  OpenPGPConfig,
  OpenPGPPipelineResult,
  PacketTreeNode,
  runOpenPGPPipeline,
  tamperPipeline,
  HashAlgorithm,
  CompressionAlgorithm,
  CipherAlgorithm,
} from '@/lib/openpgp/openpgpEngine';

// Strict discriminated union types to eliminate `as any`
type OpenPGPTab = 'flow' | 'packets' | 'entropy' | 'sandbox' | 'theory';
type TamperMode = 'NONE' | 'CORRUPT_CIPHERTEXT' | 'WRONG_RECIPIENT_KEY' | 'TAMPER_SIGNATURE';

const PRESETS: { name: string; description: string; config: OpenPGPConfig }[] = [
  {
    name: 'Standard Email Encryption',
    description: 'Alice signs with RSA-2048 and encrypts for Bob using AES-256 and ZLIB compression.',
    config: {
      plaintext:
        'CONFIDENTIAL: Project Phoenix launch coordinates are confirmed for Q3. Please verify signature before decryption.',
      signerName: 'Alice Vance',
      signerKeyId: '0xA11CE404',
      signerKeyType: 'RSA-2048',
      recipientName: 'Bob Miller',
      recipientKeyId: '0xB0B80B80',
      recipientKeyType: 'RSA-2048',
      hashAlgo: 'SHA-256',
      compressionAlgo: 'ZLIB',
      cipherAlgo: 'AES-256',
    },
  },
  {
    name: 'High-Entropy Payload',
    description: 'Demonstrates high compression ratio on repetitive structured JSON data.',
    config: {
      plaintext:
        '{"status":"success","records":[{"id":101,"val":"AAAAAA"},{"id":102,"val":"AAAAAA"},{"id":103,"val":"AAAAAA"}]}',
      signerName: 'Security Bot',
      signerKeyId: '0x9999BBBB',
      signerKeyType: 'Ed25519 / X25519',
      recipientName: 'Audit System',
      recipientKeyId: '0x8888CCCC',
      recipientKeyType: 'Ed25519 / X25519',
      hashAlgo: 'SHA-512',
      compressionAlgo: 'ZIP',
      cipherAlgo: 'AES-256',
    },
  },
  {
    name: 'Modern ECC & ChaCha20',
    description: 'Uses Ed25519 / X25519 keypairs with ChaCha20-Poly1305 symmetric cipher.',
    config: {
      plaintext: 'Deploying quantum-resistant firmware update v4.2.0 to satellite gateway node #14.',
      signerName: 'Root CA',
      signerKeyId: '0x7777EEEE',
      signerKeyType: 'Ed25519 / X25519',
      recipientName: 'Gateway Node',
      recipientKeyId: '0x3333FFFF',
      recipientKeyType: 'Ed25519 / X25519',
      hashAlgo: 'SHA-512',
      compressionAlgo: 'DEFLATE',
      cipherAlgo: 'ChaCha20',
    },
  },
];

export default function OpenPGPExplorer() {
  const [activeTab, setActiveTab] = useState<OpenPGPTab>('flow');
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [copiedArmor, setCopiedArmor] = useState<boolean>(false);
  const [tamperMode, setTamperMode] = useState<TamperMode>('NONE');

  // Config state
  const [config, setConfig] = useState<OpenPGPConfig>(PRESETS[0].config);

  // Compute pipeline results
  const pipelineResult: OpenPGPPipelineResult = useMemo(() => {
    return runOpenPGPPipeline(config);
  }, [config]);

  // Compute sandbox recipient results based on tamper mode
  const sandboxResult = useMemo(() => {
    return tamperPipeline(pipelineResult, tamperMode);
  }, [pipelineResult, tamperMode]);

  const handleCopyArmor = () => {
    navigator.clipboard.writeText(pipelineResult.stage5.armoredText);
    setCopiedArmor(true);
    setTimeout(() => setCopiedArmor(false), 2000);
  };

  const handlePresetSelect = (presetConfig: OpenPGPConfig) => {
    setConfig(presetConfig);
    setTamperMode('NONE');
  };

  const stageTitles = [
    { num: 1, name: 'Plaintext & Setup', desc: 'Raw payload & Keypair selection' },
    { num: 2, name: 'Sign (Literal Data)', desc: 'Compute hash & Signer signature' },
    { num: 3, name: 'Compress Data', desc: 'Deflate payload & Signature bundle' },
    { num: 4, name: 'Encrypt Payload', desc: 'Session key & Symmetric cipher' },
    { num: 5, name: 'ASCII Armor', desc: 'Radix-64 encoding & CRC-24' },
    { num: 6, name: 'Decrypt & Verify', desc: 'Recipient reverse pipeline' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-teal-900/40 via-zinc-900 to-cyan-950/40 border border-teal-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">
              <Shield className="w-4 h-4 text-teal-400" />
              RFC 4880 & RFC 9580 Standard Pipeline
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              OpenPGP Workflow Explorer
            </h2>
            <p className="mt-2 text-zinc-300 max-w-3xl leading-relaxed text-sm sm:text-base">
              Explore how OpenPGP securely sends data by combining asymmetric signing, compression, and symmetric session key encryption into a standardized packet hierarchy.
            </p>
          </div>

          {/* Quick Presets Dropdown */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
            <span className="text-xs text-zinc-400 font-medium self-center">Presets:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSelect(p.config)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  config.plaintext === p.config.plaintext
                    ? 'bg-teal-500 text-zinc-950 border-teal-400 font-bold shadow-lg shadow-teal-500/20'
                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700/80 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 scrollbar-hide">
        {[
          { id: 'flow' as OpenPGPTab, label: 'Pipeline Stepper', icon: Layers },
          { id: 'packets' as OpenPGPTab, label: 'Packet Tree Inspector', icon: FileSearch },
          { id: 'entropy' as OpenPGPTab, label: 'Entropy & Compression Lab', icon: BarChart3 },
          { id: 'sandbox' as OpenPGPTab, label: 'Decrypt & Verify Sandbox', icon: ShieldAlert },
          { id: 'theory' as OpenPGPTab, label: 'Standards & Security Theory', icon: BookOpen },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-teal-500 text-white dark:text-zinc-950 dark:font-bold shadow-md shadow-teal-500/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PIPELINE STEPPER */}
      {activeTab === 'flow' && (
        <div className="space-y-8">
          {/* Configurator Box */}
          <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-500" />
              Pipeline Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Plaintext Payload
                </label>
                <input
                  type="text"
                  value={config.plaintext}
                  onChange={e => setConfig({ ...config, plaintext: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Hash Algorithm (Sign)
                </label>
                <select
                  value={config.hashAlgo}
                  onChange={e => setConfig({ ...config, hashAlgo: e.target.value as HashAlgorithm })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="SHA-256">SHA-256</option>
                  <option value="SHA-512">SHA-512</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Compression Algorithm
                </label>
                <select
                  value={config.compressionAlgo}
                  onChange={e =>
                    setConfig({ ...config, compressionAlgo: e.target.value as CompressionAlgorithm })
                  }
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="ZLIB">ZLIB (RFC 1950)</option>
                  <option value="ZIP">ZIP (RFC 1951)</option>
                  <option value="DEFLATE">DEFLATE</option>
                  <option value="Uncompressed">Uncompressed (No Zip)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Symmetric Cipher
                </label>
                <select
                  value={config.cipherAlgo}
                  onChange={e => setConfig({ ...config, cipherAlgo: e.target.value as CipherAlgorithm })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="AES-256">AES-256-GCM / SEIPD</option>
                  <option value="AES-128">AES-128-GCM / SEIPD</option>
                  <option value="ChaCha20">ChaCha20-Poly1305</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {stageTitles.map((st, idx) => (
              <button
                key={st.num}
                onClick={() => setActiveStageIndex(idx)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeStageIndex === idx
                    ? 'bg-teal-500 text-white dark:text-zinc-950 border-teal-400 shadow-md shadow-teal-500/20 font-bold'
                    : activeStageIndex > idx
                    ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-900/50'
                    : 'bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold uppercase">Step {st.num}</span>
                  {activeStageIndex > idx && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                </div>
                <div className="text-xs font-bold truncate">{st.name}</div>
              </button>
            ))}
          </div>

          {/* Active Stage Details Card */}
          <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-md">
            {activeStageIndex === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-500" />
                    Stage 1: Plaintext Input & Key setup
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    The sender prepares the raw message payload and selects cryptographic keys.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400 mb-2">Sender (Alice) Signer Key</h4>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Name: {config.signerName}</p>
                    <p className="text-xs font-mono text-zinc-500">Key ID: {config.signerKeyId}</p>
                    <p className="text-xs text-zinc-400 mt-1">Algorithm: {config.signerKeyType}</p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400 mb-2">Recipient (Bob) Encryption Key</h4>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Name: {config.recipientName}</p>
                    <p className="text-xs font-mono text-zinc-500">Key ID: {config.recipientKeyId}</p>
                    <p className="text-xs text-zinc-400 mt-1">Algorithm: {config.recipientKeyType}</p>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase text-zinc-500">Raw Plaintext Byte Metrics</span>
                  <div className="flex flex-wrap gap-6 mt-2">
                    <div>
                      <span className="text-xs text-zinc-500">Byte Size:</span>
                      <p className="text-lg font-mono font-bold text-zinc-900 dark:text-white">{pipelineResult.stage1.plaintextBytes} B</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Shannon Entropy:</span>
                      <p className="text-lg font-mono font-bold text-amber-500">{pipelineResult.stage1.entropy} / 8.0 bits/byte</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStageIndex === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-teal-500" />
                    Stage 2: Sign Plaintext (Literal Data & Signature Packets)
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Plaintext is hashed with {config.hashAlgo} and signed with Alice&apos;s private key. OpenPGP creates One-Pass Signature (Tag 4), Literal Data (Tag 11), and Signature (Tag 2) packets.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">1. {config.hashAlgo} Digest Calculation</span>
                    <p className="font-mono text-xs break-all text-zinc-700 dark:text-zinc-300 mt-1 bg-zinc-100 dark:bg-zinc-900 p-2 rounded">
                      {pipelineResult.stage2.hashDigestHex}
                    </p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">2. Digital Signature (RSA / Ed25519)</span>
                    <p className="font-mono text-xs break-all text-zinc-700 dark:text-zinc-300 mt-1 bg-zinc-100 dark:bg-zinc-900 p-2 rounded">
                      {pipelineResult.stage2.signatureHex}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="font-bold text-teal-600 dark:text-teal-400">Tag 4 (One-Pass Sign)</span>
                      <p className="mt-1 text-zinc-500 break-all">{pipelineResult.stage2.onePassPacketHex}</p>
                    </div>
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="font-bold text-teal-600 dark:text-teal-400">Tag 11 (Literal Data)</span>
                      <p className="mt-1 text-zinc-500 break-all">{pipelineResult.stage2.literalPacketHex.slice(0, 32)}...</p>
                    </div>
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="font-bold text-teal-600 dark:text-teal-400">Tag 2 (Signature)</span>
                      <p className="mt-1 text-zinc-500 break-all">{pipelineResult.stage2.signaturePacketHex.slice(0, 32)}...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStageIndex === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-teal-500" />
                    Stage 3: Compression Stage ({config.compressionAlgo})
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    The combined signed bundle is compressed BEFORE encryption. This removes patterns, enhances entropy, and reduces message size.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 font-bold uppercase">Original Size</span>
                    <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">{pipelineResult.stage3.originalSize} B</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 font-bold uppercase">Compressed Size</span>
                    <p className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">{pipelineResult.stage3.compressedSize} B</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 font-bold uppercase">Size Reduction</span>
                    <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">-{pipelineResult.stage3.compressionRatio}%</p>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">Entropy Metric Shift</span>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Plaintext Entropy: {pipelineResult.stage3.originalEntropy} / 8.0</span>
                      <span>Compressed Entropy: {pipelineResult.stage3.compressedEntropy} / 8.0</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${(pipelineResult.stage3.originalEntropy / 8.0) * 100}%` }}
                      />
                      <div
                        className="bg-teal-500 h-full"
                        style={{ width: `${((pipelineResult.stage3.compressedEntropy - pipelineResult.stage3.originalEntropy) / 8.0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStageIndex === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-teal-500" />
                    Stage 4: Encrypt Payload ({config.cipherAlgo})
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    A random symmetric session key is generated. The session key is encrypted with Bob&apos;s Public Key (PKESK Packet - Tag 1), and compressed payload is encrypted using {config.cipherAlgo} (SEIPD Packet - Tag 18).
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">Generated Session Key</span>
                    <p className="font-mono text-sm text-amber-500 mt-1 bg-zinc-100 dark:bg-zinc-900 p-2 rounded">
                      {pipelineResult.stage4.sessionKeyHex}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">Tag 1: PKESK Packet</span>
                      <p className="text-xs text-zinc-500 mt-1">Encrypted for Key ID {config.recipientKeyId}</p>
                      <p className="font-mono text-xs break-all text-zinc-400 mt-2 bg-zinc-100 dark:bg-zinc-900 p-2 rounded">
                        {pipelineResult.stage4.pkeskHex.slice(0, 48)}...
                      </p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">Tag 18: SEIPD Encrypted Packet</span>
                      <p className="text-xs text-zinc-500 mt-1">MDC Integrity Protected Payload</p>
                      <p className="font-mono text-xs break-all text-zinc-400 mt-2 bg-zinc-100 dark:bg-zinc-900 p-2 rounded">
                        {pipelineResult.stage4.seipdHex.slice(0, 48)}...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStageIndex === 4 && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-teal-500" />
                      Stage 5: ASCII Armor Encoding (Radix-64)
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      Binary OpenPGP packets are converted to human-readable ASCII armor text format with CRC-24 checksum for email transmission.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyArmor}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-teal-500 text-zinc-950 rounded-xl hover:bg-teal-400 transition-all"
                  >
                    {copiedArmor ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedArmor ? 'Copied!' : 'Copy Armored Message'}
                  </button>
                </div>

                <pre className="font-mono text-xs bg-zinc-950 text-teal-300 p-4 rounded-xl border border-zinc-800 overflow-x-auto leading-relaxed shadow-inner">
                  {pipelineResult.stage5.armoredText}
                </pre>
              </div>
            )}

            {activeStageIndex === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Unlock className="w-5 h-5 text-teal-500" />
                    Stage 6: Recipient (Bob) Decryption & Verification
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Bob executes the reverse pipeline: PKESK session key decryption → SEIPD payload decryption → Decompression → Signature verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold uppercase text-emerald-400">1. PKESK Decrypt</span>
                    <p className="text-xs text-zinc-300 mt-1">Session key decrypted with Bob&apos;s Private Key</p>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold uppercase text-emerald-400">2. SEIPD Auth Check</span>
                    <p className="text-xs text-zinc-300 mt-1">MDC checksum verified (0 tampered bytes)</p>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold uppercase text-emerald-400">3. Decompress</span>
                    <p className="text-xs text-zinc-300 mt-1">{config.compressionAlgo} decompressed successfully</p>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold uppercase text-emerald-400">4. Verify Signer</span>
                    <p className="text-xs text-zinc-300 mt-1">Valid signature from Alice ({config.signerKeyId})</p>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">Recovered Plaintext Payload</span>
                  <p className="font-mono text-sm text-zinc-900 dark:text-white mt-2 p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                    {pipelineResult.stage6.recoveredPlaintext}
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Footer Controls */}
            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
              <button
                onClick={() => setActiveStageIndex(Math.max(0, activeStageIndex - 1))}
                disabled={activeStageIndex === 0}
                className="px-4 py-2 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Previous Stage
              </button>
              <button
                onClick={() => setActiveStageIndex(Math.min(5, activeStageIndex + 1))}
                disabled={activeStageIndex === 5}
                className="px-4 py-2 text-xs font-bold bg-teal-500 text-zinc-950 rounded-xl hover:bg-teal-400 disabled:opacity-40"
              >
                Next Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PACKET TREE INSPECTOR */}
      {activeTab === 'packets' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-teal-500" />
              OpenPGP Binary Packet Hierarchy Explorer
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              OpenPGP messages consist of nested tag-length-value binary packets. Inspect the exact packet tree generated for this workflow.
            </p>
          </div>

          <div className="space-y-4">
            <PacketNodeItem node={pipelineResult.stage4.fullPacketTree} defaultExpanded={true} />
          </div>
        </div>
      )}

      {/* TAB 3: ENTROPY & COMPRESSION LAB */}
      {activeTab === 'entropy' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-500" />
                Shannon Entropy & Compression Science Lab
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Why does OpenPGP specify <b>Sign → Compress → Encrypt</b> rather than Encrypt → Compress? Explore the entropy physics of plaintext vs compressed vs ciphertext.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase text-amber-500">1. Plaintext Payload</span>
                <p className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white mt-2">
                  {pipelineResult.stage3.originalEntropy} <span className="text-xs text-zinc-500">/ 8.0</span>
                </p>
                <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${(pipelineResult.stage3.originalEntropy / 8.0) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Contains character repetitions & structural redundancy.
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase text-teal-500">2. Compressed Bundle</span>
                <p className="text-3xl font-extrabold font-mono text-teal-600 dark:text-teal-400 mt-2">
                  {pipelineResult.stage3.compressedEntropy} <span className="text-xs text-zinc-500">/ 8.0</span>
                </p>
                <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full"
                    style={{ width: `${(pipelineResult.stage3.compressedEntropy / 8.0) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  -{pipelineResult.stage3.compressionRatio}% size reduction. Increased data density.
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase text-cyan-400">3. Encrypted Ciphertext</span>
                <p className="text-3xl font-extrabold font-mono text-cyan-400 mt-2">
                  {pipelineResult.stage4.ciphertextEntropy} <span className="text-xs text-zinc-500">/ 8.0</span>
                </p>
                <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full"
                    style={{ width: `${(pipelineResult.stage4.ciphertextEntropy / 8.0) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Maximum pseudo-randomness (~8.0 bits/byte). Zero compressible redundancy.
                </p>
              </div>
            </div>

            <div className="p-6 bg-teal-500/10 border border-teal-500/30 rounded-2xl space-y-3">
              <h4 className="text-base font-bold text-teal-400 flex items-center gap-2">
                <Zap className="w-5 h-5 text-teal-400" />
                Why Encrypt-then-Compress Fails
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                If you attempt to compress encrypted ciphertext, compression algorithms like DEFLATE or ZIP will achieve a <b>0% compression ratio</b>. Compressing plaintext BEFORE encryption reduces ciphertext size and removes statistical redundancy that cryptanalysts could exploit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DECRYPT & VERIFY SANDBOX */}
      {activeTab === 'sandbox' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-teal-500" />
              Recipient Tamper Testing & Integrity Sandbox
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Simulate attacks in transit (tampered ciphertext, invalid recipient private key, or forged signature) to observe how SEIPD MDC and OpenPGP signatures detect corruption.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'NONE' as TamperMode, label: '1. Valid Transmission', desc: 'No tampering' },
              { id: 'CORRUPT_CIPHERTEXT' as TamperMode, label: '2. Corrupt Ciphertext', desc: 'Mutate SEIPD bytes' },
              { id: 'WRONG_RECIPIENT_KEY' as TamperMode, label: '3. Wrong Private Key', desc: 'Mismatched Key ID' },
              { id: 'TAMPER_SIGNATURE' as TamperMode, label: '4. Tamper Signature', desc: 'Corrupt signature packet' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setTamperMode(m.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  tamperMode === m.id
                    ? 'bg-teal-500 text-zinc-950 border-teal-400 font-bold shadow-lg shadow-teal-500/20'
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="text-xs font-extrabold uppercase">{m.label}</div>
                <div className="text-xs text-zinc-500 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h4 className="text-sm font-bold uppercase text-teal-600 dark:text-teal-400">
              Recipient Execution Status
            </h4>

            {sandboxResult.tamperMessage ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-bold text-rose-400">Cryptographic Verification Failed</h5>
                  <p className="text-xs text-zinc-300 mt-1">{sandboxResult.tamperMessage}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-bold text-emerald-400">All Security Checks Passed</h5>
                  <p className="text-xs text-zinc-300 mt-1">
                    PKESK session key decrypted, SEIPD MDC integrity verified, and Alice&apos;s digital signature authenticated!
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500">PKESK Decryption:</span>
                <p className={`font-bold mt-1 ${sandboxResult.isSessionKeyDecrypted ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {sandboxResult.isSessionKeyDecrypted ? 'SUCCESS' : 'FAILED'}
                </p>
              </div>

              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500">SEIPD MDC Check:</span>
                <p className={`font-bold mt-1 ${sandboxResult.isIntegrityVerified ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {sandboxResult.isIntegrityVerified ? 'VALID' : 'INVALID'}
                </p>
              </div>

              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500">Decompression:</span>
                <p className={`font-bold mt-1 ${sandboxResult.isDecompressed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {sandboxResult.isDecompressed ? 'OK' : 'FAILED'}
                </p>
              </div>

              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500">Signer Verification:</span>
                <p className={`font-bold mt-1 ${sandboxResult.isSignatureVerified ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {sandboxResult.isSignatureVerified ? 'VERIFIED' : 'UNVERIFIED'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: THEORY & STANDARDS HUB */}
      {activeTab === 'theory' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-500" />
              OpenPGP Architecture & Standards Guide (RFC 4880 / RFC 9580)
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Deep dive into OpenPGP principles, Sign-then-Compress-then-Encrypt ordering guarantees, and Web-of-Trust trust delegation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400">1. Sign-then-Compress-then-Encrypt</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Signing raw plaintext ensures that signature computation depends strictly on uncompressed text content, making verification independent of compression algorithms. Compressing before encrypting maximizes entropy and reduces data redundancy.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400">2. SEIPD & Modification Detection Codes (MDC)</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Legacy PGP used unauthenticated AES-CFB, making it vulnerable to ciphertext bit-flipping attacks (EFAIL). Modern OpenPGP RFC 4880/9580 mandates SEIPD (Tag 18) with SHA-1 MDC or AEAD (AES-GCM) to guarantee authenticated encryption.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400">3. Hybrid Cryptography</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Asymmetric algorithms (RSA/X25519) are computationally heavy. OpenPGP generates a high-speed random symmetric session key for bulk payload encryption, then encrypts only the session key with public key cryptography.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400">4. Web-of-Trust (WoT) vs Central CAs</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Unlike TLS which relies on centralized Certificate Authorities (CAs), OpenPGP pioneered decentralized Web-of-Trust where users sign each other&apos;s public keys directly, building a web of peer-verified identities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Recursive Packet Tree Node Renderer
 */
function PacketNodeItem({ node, defaultExpanded = false }: { node: PacketTreeNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-md border border-teal-500/30">
            Tag {node.tag}
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-white">{node.name}</span>
          <span className="text-xs text-zinc-500 font-mono">({node.length} Bytes)</span>
        </div>
        <span className="text-xs font-bold text-teal-500">{expanded ? 'Collapse [-]' : 'Expand [+]'}</span>
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-zinc-200 dark:border-zinc-800/60 space-y-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{node.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {node.fields.map((f, idx) => (
              <div key={idx} className="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 font-bold block">{f.label}:</span>
                <span className="text-zinc-900 dark:text-white font-medium break-all">{f.value}</span>
              </div>
            ))}
          </div>

          {node.children && node.children.length > 0 && (
            <div className="pl-4 border-l-2 border-teal-500/30 space-y-3 mt-3">
              <span className="text-xs font-bold uppercase text-zinc-500">Nested Child Packets</span>
              {node.children.map(child => (
                <PacketNodeItem key={child.id} node={child} defaultExpanded={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
