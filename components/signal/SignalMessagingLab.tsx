'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Lock,
  Key,
  MessageSquare,
  Send,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  BookOpen,
  UserCheck,
  ShieldAlert,
  Cpu,
  Flame,
} from 'lucide-react';
import {
  createSignalConversation,
  runSelfHealingAttackSimulation,
  EncryptedSignalMessage,
  RatchetStateSnapshot,
  SelfHealingTestResult,
  simulateX3DH,
} from '@/lib/signal/signalRatchetEngine';

export default function SignalMessagingLab() {
  const [activeTab, setActiveTab] = useState<'chat' | 'state' | 'attack' | 'x3dh' | 'theory'>('chat');
  const [activeUser, setActiveUser] = useState<'Alice' | 'Bob'>('Alice');
  const [inputMessage, setInputMessage] = useState<string>('Hello Bob! Double Ratchet session initialized.');

  // Persistent Conversation Session
  const [conversation, setConversation] = useState(() => createSignalConversation());
  const [messages, setMessages] = useState<EncryptedSignalMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EncryptedSignalMessage | null>(null);

  // Attack simulator state
  const [attackResult, setAttackResult] = useState<SelfHealingTestResult | null>(null);
  const [isCompromised, setIsCompromised] = useState<boolean>(false);

  // Reset conversation
  const handleResetSession = () => {
    const newConv = createSignalConversation();
    setConversation(newConv);
    setMessages([]);
    setSelectedMessage(null);
    setIsCompromised(false);
    setAttackResult(null);
  };

  // Send message handler
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const senderSession = activeUser === 'Alice' ? conversation.aliceSession : conversation.bobSession;
    const recipientSession = activeUser === 'Alice' ? conversation.bobSession : conversation.aliceSession;

    // Encrypt from sender
    const encryptedMsg = senderSession.encryptMessage(inputMessage);

    // Decrypt at recipient
    recipientSession.decryptMessage(encryptedMsg);

    setMessages(prev => [...prev, encryptedMsg]);
    setSelectedMessage(encryptedMsg);
    setInputMessage('');

    // Toggle active user for easy back-and-forth chat
    setActiveUser(activeUser === 'Alice' ? 'Bob' : 'Alice');
  };

  const aliceSnapshot: RatchetStateSnapshot = useMemo(() => conversation.aliceSession.getSnapshot(), [conversation, messages]);
  const bobSnapshot: RatchetStateSnapshot = useMemo(() => conversation.bobSession.getSnapshot(), [conversation, messages]);
  const x3dhData = useMemo(() => simulateX3DH(), []);

  const handleRunAttackSimulation = () => {
    const res = runSelfHealingAttackSimulation();
    setAttackResult(res);
    setIsCompromised(true);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-teal-950/50 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Signal Protocol Standard (RFC / Double Ratchet Specs)
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Signal Secure Messaging Lab
            </h2>
            <p className="mt-2 text-zinc-300 max-w-3xl leading-relaxed text-sm sm:text-base">
              Master the <b>Double Ratchet Algorithm</b> and <b>X3DH Handshake</b> powering Signal, WhatsApp, and Matrix. Observe KDF chain ratcheting, Diffie-Hellman key refreshes, and self-healing break-in recovery.
            </p>
          </div>

          <button
            onClick={handleResetSession}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl transition-all shadow-md shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            Reset Ratchet Session
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 scrollbar-hide">
        {[
          { id: 'chat' as const, label: 'Interactive Ratchet Chat', icon: MessageSquare },
          { id: 'state' as const, label: 'Ratchet State & Trees', icon: Layers },
          { id: 'attack' as const, label: 'Self-Healing Security Lab', icon: Flame },
          { id: 'x3dh' as const, label: 'X3DH Handshake Setup', icon: UserCheck },
          { id: 'theory' as const, label: 'Protocol Architecture & Theory', icon: BookOpen },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: INTERACTIVE CHAT & RATCHET FLOW */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Chat Window Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col h-[520px]">
              {/* Chat Header */}
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    Signal E2EE Session (Alice &lt;--&gt; Bob)
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-500">Double Ratchet Active</span>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-hide">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-40 text-emerald-500" />
                    <p className="text-sm font-medium">No messages sent yet.</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Type a message below from Alice or Bob to initiate the KDF Chain & DH Ratchet!
                    </p>
                  </div>
                ) : (
                  messages.map(m => {
                    const isAlice = m.sender === 'Alice';
                    const isSelected = selectedMessage?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMessage(m)}
                        className={`w-full flex flex-col text-left transition-all ${
                          isAlice ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl border ${
                            isAlice
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                              : 'bg-teal-500/10 border-teal-500/30 text-teal-950 dark:text-teal-100'
                          } ${isSelected ? 'ring-2 ring-emerald-500 shadow-md' : ''}`}
                        >
                          <div className="flex justify-between items-center gap-4 text-xs font-bold mb-1 opacity-80">
                            <span>{m.sender}</span>
                            <span>{m.timestamp}</span>
                          </div>
                          <p className="text-sm font-medium">{m.plaintextPayload}</p>
                          <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between gap-2">
                            <span className="truncate">Ciphertext: {m.ciphertextHex.slice(0, 16)}...</span>
                            <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">N={m.header.n}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Sender:</span>
                  <button
                    onClick={() => setActiveUser('Alice')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      activeUser === 'Alice'
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    Alice
                  </button>
                  <button
                    onClick={() => setActiveUser('Bob')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      activeUser === 'Bob'
                        ? 'bg-teal-500 text-zinc-950 border-teal-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    Bob
                  </button>
                </div>

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Type message as ${activeUser}...`}
                    className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ratchet Keys Live Inspector Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  Live Double Ratchet State Inspector
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Inspect active key states. Notice how sending a message advances the KDF Chain, and replying triggers a DH Ratchet!
                </p>
              </div>

              {/* Selected Message Keys */}
              {selectedMessage && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    Inspecting Selected Message ({selectedMessage.id.slice(0, 10)})
                  </span>
                  <div className="text-xs font-mono space-y-1">
                    <p className="text-zinc-600 dark:text-zinc-300">
                      <span className="text-zinc-500">Sender:</span> {selectedMessage.sender} → {selectedMessage.recipient}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      <span className="text-zinc-500">Message Key ($MK$):</span>{' '}
                      <span className="text-emerald-500 font-bold">{selectedMessage.messageKeyHex.slice(0, 24)}...</span>
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      <span className="text-zinc-500">Ephemeral DH Public Key:</span>{' '}
                      <span className="text-teal-400">{selectedMessage.header.dhPublicKeyHex.slice(0, 24)}...</span>
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      <span className="text-zinc-500">Header Counter (N, PN):</span> N={selectedMessage.header.n}, PN={selectedMessage.header.pn}
                    </p>
                  </div>
                </div>
              )}

              {/* State comparison */}
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Alice Session State</span>
                  <div className="mt-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <p>Root Key ($RK$): {aliceSnapshot.rootKeyHex.slice(0, 20)}...</p>
                    <p>Sending Chain ($CK_s$): {aliceSnapshot.sendingChainKeyHex.slice(0, 20)}...</p>
                    <p>Receiving Chain ($CK_r$): {aliceSnapshot.receivingChainKeyHex.slice(0, 20)}...</p>
                    <p>Send Count: {aliceSnapshot.sendMessageCount} msgs</p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="font-bold text-teal-600 dark:text-teal-400">Bob Session State</span>
                  <div className="mt-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <p>Root Key ($RK$): {bobSnapshot.rootKeyHex.slice(0, 20)}...</p>
                    <p>Sending Chain ($CK_s$): {bobSnapshot.sendingChainKeyHex.slice(0, 20)}...</p>
                    <p>Receiving Chain ($CK_r$): {bobSnapshot.receivingChainKeyHex.slice(0, 20)}...</p>
                    <p>Send Count: {bobSnapshot.sendMessageCount} msgs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RATCHET STATE & TREES */}
      {activeTab === 'state' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              Double Ratchet Architecture Diagram
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              The Double Ratchet combines two distinct key progression systems: the <b>Symmetric KDF Chain</b> (advances per message) and the <b>Diffie-Hellman Ratchet</b> (advances per round-trip response).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h4 className="text-sm font-bold text-emerald-500 uppercase flex items-center gap-2">
                <Zap className="w-4 h-4" /> 1. KDF Chain (Symmetric Ratchet)
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                For every message sent in a chain, the chain key advances through a key derivation step. Message keys are deleted immediately after use.
              </p>
              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 font-mono text-xs rounded-xl space-y-1 text-emerald-400">
                <p>CK_0 ──► [KDF Step] ──► MK_1 (Encrypted Payload 1)</p>
                <p> └──► CK_1 ──► [KDF Step] ──► MK_2 (Encrypted Payload 2)</p>
              </div>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h4 className="text-sm font-bold text-teal-400 uppercase flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> 2. Diffie-Hellman Ratchet (Asymmetric)
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                When a recipient receives a message with a new ephemeral DH public key, a new ECDH shared secret is derived to ratchet the root key and update the receiving chain keys.
              </p>
              <div className="p-3 bg-zinc-100 dark:bg-zinc-900 font-mono text-xs rounded-xl space-y-1 text-teal-400">
                <p>RK_0 ──► + ECDH(Alice_DH, Bob_DH) ──► RK_1 (New Root Key)</p>
                <p> └──► Derived New Sending & Receiving Chain Keys!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SELF-HEALING SECURITY LAB */}
      {activeTab === 'attack' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                Post-Compromise Security (Break-in Recovery) Simulator
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Test what happens when an attacker temporarily steals an active Root Key. See how the Double Ratchet automatically self-heals as soon as legitimate parties exchange new DH keys!
              </p>
            </div>

            <button
              onClick={handleRunAttackSimulation}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-rose-500/20 shrink-0"
            >
              <ShieldAlert className="w-4 h-4" />
              Simulate Key Compromise Attack
            </button>
          </div>

          {attackResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-bold text-emerald-400">1. Forward Secrecy Guarantee</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Even though the attacker compromised state at Step {attackResult.compromisedStep}, past message keys ($MK_1$) were already deleted and cannot be re-derived from the leaked root key!
                  </p>
                </div>

                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-bold text-emerald-400">2. Post-Compromise Self-Healing</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    When Bob replied at Step {attackResult.healedStep}, his fresh ephemeral DH key triggered a DH Ratchet step. The root key refreshed to an un-compromised state, locking out the attacker!
                  </p>
                </div>
              </div>

              {/* Execution Audit Log */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2 font-mono text-xs">
                <span className="font-bold text-zinc-500 uppercase">Attack Simulation Audit Trajectory</span>
                <div className="space-y-1.5 text-zinc-700 dark:text-zinc-300 mt-2">
                  {attackResult.messageLog.map((log, idx) => (
                    <div key={idx} className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: X3DH HANDSHAKE SETUP */}
      {activeTab === 'x3dh' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              X3DH (Extended Triple Diffie-Hellman) Asynchronous Setup
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Before starting a Double Ratchet session, Alice fetches Bob&apos;s published Pre-Key Bundle from a server and performs 4 ECDH calculations asynchronously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-emerald-500">Alice&apos;s Keys</span>
              <p>Identity Key ($IK_A$): {x3dhData.aliceIK.publicKeyHex.slice(0, 24)}...</p>
              <p>Ephemeral Key ($EK_A$): {x3dhData.aliceEK.publicKeyHex.slice(0, 24)}...</p>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-teal-400">Bob&apos;s Published Pre-Key Bundle</span>
              <p>Identity Key ($IK_B$): {x3dhData.bobIK.publicKeyHex.slice(0, 24)}...</p>
              <p>Signed PreKey ($SPK_B$): {x3dhData.bobSPK.publicKeyHex.slice(0, 24)}...</p>
              <p>One-Time PreKey ($OPK_B$): {x3dhData.bobOPK.publicKeyHex.slice(0, 24)}...</p>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
            <span className="font-bold text-emerald-500 uppercase">The 4 X3DH ECDH Exchanges</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono">
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">DH1:</span>
                <span>ECDH($IK_A$, $SPK_B$)</span>
              </div>
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">DH2:</span>
                <span>ECDH($EK_A$, $IK_B$)</span>
              </div>
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">DH3:</span>
                <span>ECDH($EK_A$, $SPK_B$)</span>
              </div>
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded">
                <span className="text-zinc-500 font-bold block">DH4:</span>
                <span>ECDH($EK_A$, $OPK_B$)</span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs">
              Master initial root key is derived from all four X3DH shared secrets.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: THEORY & GUIDE */}
      {activeTab === 'theory' && (
        <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              Signal Protocol Standards & Cryptographic Principles
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Created by Trevor Perrin and Moxie Marlinspike, the Signal Protocol is the gold standard for asynchronous end-to-end encrypted messaging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-emerald-400">1. Forward Secrecy vs Backward Secrecy</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                <b>Forward Secrecy</b> ensures that compromising a long-term key does not reveal past communications. <b>Backward Secrecy (Post-Compromise Security)</b> ensures that compromising a key today does not compromise future communications after key rotation!
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-emerald-400">2. Out-of-Order Message Handling</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Network packets may arrive out of order. If Message 3 arrives before Message 2, the receiver steps the KDF chain, saves Message Key $MK_2$ in skipped keys buffer, decrypts Message 3, and later decrypts Message 2 when it arrives.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-emerald-400">3. Cryptographic Primitives</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                The protocol relies on Curve25519 for ECDH, HKDF (SHA-256) for Key Derivation Functions, and AES-256-GCM / ChaCha20-Poly1305 for authenticated symmetric encryption.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-sm font-bold text-emerald-400">4. Real-World Deployments</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                The Signal Protocol secures billions of users worldwide across Signal App, WhatsApp, Google Messages (RCS), Facebook Messenger Secret Conversations, and Matrix.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
