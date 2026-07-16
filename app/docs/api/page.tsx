"use client";

import React, { useState, useMemo } from "react";
import Navbar from "../../../components/layout/Navbar";
import {
  Terminal as TerminalIcon,
  Key,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  AlertCircle,
  FileCode,
  Code,
  Globe,
  Sliders,
  Database
} from "lucide-react";

// Import real cryptographic helpers for the interactive sandbox
import { encrypt as caesarEncrypt, decrypt as caesarDecrypt } from "../../../lib/cipher/classical/caesar";
import { encrypt as aesEncrypt, decrypt as aesDecrypt } from "../../../lib/cipher/symmetric/aes";
import { encrypt as sha256Encrypt } from "../../../lib/cipher/hash/sha256";
import { encrypt as rsaEncrypt, decrypt as rsaDecrypt } from "../../../lib/cipher/asymmetric/rsa";

// API endpoints metadata
interface ParameterDoc {
  name: string;
  type: string;
  required: boolean;
  default: string;
  description: string;
}

interface EndpointDoc {
  path: string;
  method: "GET" | "POST";
  description: string;
  parameters: ParameterDoc[];
}

const ENDPOINTS: Record<string, EndpointDoc> = {
  encrypt: {
    path: "/api/v1/cipher/encrypt",
    method: "POST",
    description: "Encrypt a plaintext message using a specified cryptographic algorithm and keying material.",
    parameters: [
      { name: "cipherId", type: "string", required: true, default: "caesar", description: "The identifier of the algorithm (e.g., 'caesar', 'aes', 'rsa')." },
      { name: "input", type: "string", required: true, default: "Hello, World!", description: "The plaintext input string to be encrypted." },
      { name: "key", type: "string", required: true, default: "3", description: "Cryptographic key, passphrase, or parameters (e.g., shifts, hex keys, primes)." },
      { name: "options", type: "object", required: false, default: "{}", description: "Algorithm-specific flags like hexInput (boolean) or mode (string)." }
    ]
  },
  decrypt: {
    path: "/api/v1/cipher/decrypt",
    method: "POST",
    description: "Decrypt a ciphertext message using the correct keying material and options.",
    parameters: [
      { name: "cipherId", type: "string", required: true, default: "caesar", description: "The identifier of the algorithm (must match the encryption cipher)." },
      { name: "input", type: "string", required: true, default: "KHOOR ZRUOG", description: "The encrypted input string (ciphertext)." },
      { name: "key", type: "string", required: true, default: "3", description: "The corresponding decryption key." },
      { name: "options", type: "object", required: false, default: "{}", description: "Matching options used during the encryption phase." }
    ]
  },
  hash: {
    path: "/api/v1/hash/digest",
    method: "POST",
    description: "Generate a one-way secure digest, HMAC, or password derivation output.",
    parameters: [
      { name: "cipherId", type: "string", required: true, default: "sha256", description: "The hash function identifier (e.g., 'sha256', 'sha512', 'md5', 'hmac')." },
      { name: "input", type: "string", required: true, default: "abc", description: "The message input to hash." },
      { name: "key", type: "string", required: false, default: "", description: "HMAC secret key (only required when using HMAC)." },
      { name: "options", type: "object", required: false, default: "{}", description: "Hashing options like cost rounds for Bcrypt." }
    ]
  },
  algorithms: {
    path: "/api/v1/algorithms",
    method: "GET",
    description: "Retrieve a complete manifest of all supported cryptographic algorithms, including their metadata and current safety status.",
    parameters: []
  }
};

export default function ApiDocsPage() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<"endpoints" | "sandbox" | "errors" | "sdk">("endpoints");
  const [activeEndpoint, setActiveEndpoint] = useState<"encrypt" | "decrypt" | "hash" | "algorithms">("encrypt");

  // Sandbox inputs
  const [sandboxInput, setSandboxInput] = useState("Hello, World!");
  const [sandboxKey, setSandboxKey] = useState("3");
  const [sandboxCipher, setSandboxCipher] = useState("caesar");
  const [sandboxHexMode, setSandboxHexMode] = useState(false);

  // API Key simulation
  const [apiKey, setApiKey] = useState("cv_live_4e98f02d71c6a289b4f300ffe732");
  const [showApiKey, setShowApiKey] = useState(false);

  // Execution outputs
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalResponse, setTerminalResponse] = useState<unknown>(null);
  const [terminalHeaders, setTerminalHeaders] = useState<Record<string, string>>({});
  const [terminalStatus, setTerminalStatus] = useState<string>("");
  const [latency, setLatency] = useState<number | null>(null);

  // Copy status
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Error simulation
  const [selectedError, setSelectedError] = useState<"UNAUTHORIZED" | "INVALID_KEY" | "BUDGET_EXCEEDED">("INVALID_KEY");

  // Generate dynamic API key
  const regenerateApiKey = () => {
    const chars = "abcdef0123456789";
    let token = "cv_live_";
    for (let i = 0; i < 24; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    setApiKey(token);
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(identifier);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Run the cryptographic calculations to simulate API backend
  const executeSandboxRequest = () => {
    setTerminalLoading(true);
    setTerminalResponse(null);
    setTerminalStatus("");
    setLatency(null);

    const start = performance.now();

    setTimeout(() => {
      try {
        let payloadResult: unknown = {};
        const options: { instrument: boolean; hexInput?: boolean; demoMode?: boolean } = { instrument: true };

        if (activeEndpoint === "encrypt") {
          if (sandboxCipher === "caesar") {
            payloadResult = caesarEncrypt(sandboxInput, sandboxKey, options);
          } else if (sandboxCipher === "aes") {
            options.hexInput = sandboxHexMode;
            payloadResult = aesEncrypt(sandboxInput, sandboxKey, options);
          } else if (sandboxCipher === "rsa") {
            options.demoMode = true;
            payloadResult = rsaEncrypt(sandboxInput, sandboxKey, options);
          } else {
            throw new Error(`Unsupported cipher selection: ${sandboxCipher}`);
          }
        } else if (activeEndpoint === "decrypt") {
          if (sandboxCipher === "caesar") {
            payloadResult = caesarDecrypt(sandboxInput, sandboxKey, options);
          } else if (sandboxCipher === "aes") {
            options.hexInput = sandboxHexMode;
            payloadResult = aesDecrypt(sandboxInput, sandboxKey, options);
          } else if (sandboxCipher === "rsa") {
            options.demoMode = true;
            payloadResult = rsaDecrypt(sandboxInput, sandboxKey, options);
          } else {
            throw new Error(`Unsupported cipher selection: ${sandboxCipher}`);
          }
        } else if (activeEndpoint === "hash") {
          if (sandboxCipher === "sha256") {
            payloadResult = sha256Encrypt(sandboxInput, "", options);
          } else {
            throw new Error(`Unsupported hash selection: ${sandboxCipher}`);
          }
        } else if (activeEndpoint === "algorithms") {
          payloadResult = {
            count: 4,
            algorithms: [
              { id: "caesar", name: "Caesar Cipher", category: "classical", security: "broken" },
              { id: "aes", name: "Advanced Encryption Standard (AES)", category: "symmetric", security: "secure" },
              { id: "sha256", name: "Secure Hash Algorithm 2 (SHA-256)", category: "hash", security: "secure" },
              { id: "rsa", name: "RSA-2048", category: "asymmetric", security: "secure" }
            ]
          };
        }

        const duration = Math.round(performance.now() - start + Math.random() * 20); // Add slight random jitter
        setLatency(duration);
        setTerminalStatus("200 OK");
        setTerminalHeaders({
          "Content-Type": "application/json",
          "X-Response-Time": `${duration}ms`,
          "X-RateLimit-Limit": "1000",
          "X-RateLimit-Remaining": "994",
          "Cache-Control": "no-store, max-age=0"
        });
        setTerminalResponse(payloadResult);
      } catch (err: unknown) {
        const duration = Math.round(performance.now() - start);
        setLatency(duration);
        setTerminalStatus("400 Bad Request");
        setTerminalHeaders({
          "Content-Type": "application/json",
          "X-Response-Time": `${duration}ms`,
          "X-RateLimit-Limit": "1000",
          "X-RateLimit-Remaining": "994"
        });
        setTerminalResponse({
          error: {
            code: "VALIDATION_FAILED",
            message: err instanceof Error ? err.message : "The input parameters failed validation checks.",
            suggestion: "Check key length boundaries, cipher configurations, or alphabet parameters."
          }
        });
      } finally {
        setTerminalLoading(false);
      }
    }, 450); // Simulate API latency roundtrip
  };

  // Generate dynamic request snippets
  const requestSnippets = useMemo(() => {
    const endpoint = ENDPOINTS[activeEndpoint];
    const path = `https://api.cryptoviz.org${endpoint.path}`;

    // Payload body build
    const bodyObj: { cipherId?: string; input?: string; key?: string; options?: { hexInput?: boolean } } = {};
    if (activeEndpoint === "encrypt" || activeEndpoint === "decrypt") {
      bodyObj.cipherId = sandboxCipher;
      bodyObj.input = sandboxInput;
      bodyObj.key = sandboxKey;
      if (sandboxCipher === "aes" && sandboxHexMode) {
        bodyObj.options = { hexInput: true };
      }
    } else if (activeEndpoint === "hash") {
      bodyObj.cipherId = "sha256";
      bodyObj.input = sandboxInput;
    }

    const jsonBody = JSON.stringify(bodyObj, null, 2);

    return {
      curl: activeEndpoint === "algorithms"
        ? `curl -X GET "${path}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json"`
        : `curl -X POST "${path}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '${jsonBody.replace(/'/g, "'\\''")}'`,
      javascript: activeEndpoint === "algorithms"
        ? `fetch("${path}", {\n  method: "GET",\n  headers: {\n    "Authorization": "Bearer ${apiKey}",\n    "Content-Type": "application/json"\n  }\n})\n.then(res => res.json())\n.then(data => console.log(data));`
        : `fetch("${path}", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer ${apiKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${jsonBody.replace(/\n/g, "\n  ")})\n})\n.then(res => res.json())\n.then(data => console.log(data));`,
      python: activeEndpoint === "algorithms"
        ? `import requests\n\nurl = "${path}"\nheaders = {\n    "Authorization": "Bearer ${apiKey}",\n    "Content-Type": "application/json"\n}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())`
        : `import requests\nimport json\n\nurl = "${path}"\nheaders = {\n    "Authorization": "Bearer ${apiKey}",\n    "Content-Type": "application/json"\n}\npayload = ${jsonBody.replace(/true/g, "True").replace(/false/g, "False").replace(/\n/g, "\n  ")}\n\nresponse = requests.post(url, headers=headers, json=payload)\nprint(response.json())`
    };
  }, [activeEndpoint, sandboxCipher, sandboxInput, sandboxKey, sandboxHexMode, apiKey]);

  // Error schema definitions
  const errorMockPayloads = {
    UNAUTHORIZED: {
      status: "401 Unauthorized",
      body: {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid API key was provided in request headers.",
          details: "Make sure you pass the header: 'Authorization: Bearer cv_live_...'",
          docs: "https://cryptoviz.org/docs/api#authentication"
        }
      }
    },
    INVALID_KEY: {
      status: "400 Bad Request",
      body: {
        error: {
          code: "INVALID_KEY",
          message: "The provided cryptographic key is structurally invalid.",
          details: "AES keys require a valid hex string of exactly 32, 48, or 64 characters (128, 192, or 256 bits).",
          docs: "https://cryptoviz.org/docs/api#error-codes"
        }
      }
    },
    BUDGET_EXCEEDED: {
      status: "413 Payload Too Large",
      body: {
        error: {
          code: "BUDGET_EXCEEDED",
          message: "The size of the input payload exceeds the free tier limits.",
          details: "Plaintext is capped at 50,000 characters per single instrumentation request to avoid server bottlenecks.",
          docs: "https://cryptoviz.org/docs/api#rate-limiting"
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] font-sans text-zinc-900 dark:text-[#F5F5F5] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Hero Area */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-8 md:p-12 shadow-sm mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-purple-500/5 dark:from-[#00C2AE]/5 dark:to-purple-500/5 opacity-80" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-[#00C2AE]">
                Developer Hub
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
                CryptoViz API Reference
              </h1>
              <p className="mt-4 text-base text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
                Integrate CryptoViz&apos;s full suite of classical, symmetric, asymmetric, and hash algorithms directly into your developer workflows. Test parameters live inside our sandbox terminal.
              </p>
            </div>

            {/* Quick API Key Manager Dashboard */}
            <div className="w-full md:w-80 shrink-0 rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-zinc-50/50 dark:bg-black/40 p-5 backdrop-blur-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                  <Key size={12} className="text-teal-500 dark:text-[#00C2AE]" />
                  Your Sandbox Key
                </span>
                <button
                  onClick={regenerateApiKey}
                  title="Generate dynamic key"
                  className="text-zinc-400 hover:text-teal-500 dark:hover:text-[#00C2AE] transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-[#101013] border border-zinc-200 dark:border-[#2A2A31] rounded-lg px-3 py-2 text-sm">
                <code className="font-mono text-zinc-600 dark:text-teal-400 flex-1 truncate select-none">
                  {showApiKey ? apiKey : "••••••••••••••••••••••••••••"}
                </code>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showApiKey ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                  onClick={() => copyToClipboard(apiKey, "apikey")}
                  className="text-zinc-400 hover:text-teal-500 dark:hover:text-[#00C2AE] relative"
                >
                  {copiedSection === "apikey" ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              <p className="mt-2.5 text-[10px] text-zinc-400 dark:text-[#8A8A94] text-center">
                Keep your keys confidential. Rate limits apply to endpoints.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-zinc-200 dark:border-[#2A2A31] mb-8">
          <div className="flex space-x-8">
            {(["endpoints", "sandbox", "errors", "sdk"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 capitalize cursor-pointer ${
                  activeTab === tab
                    ? "border-teal-500 dark:border-[#00C2AE] text-teal-600 dark:text-[#00C2AE]"
                    : "border-transparent text-zinc-500 dark:text-[#8A8A94] hover:text-zinc-800 dark:hover:text-zinc-250"
                }`}
              >
                {tab === "sdk" ? "JS/TS SDK" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content 1: Endpoint Reference */}
        {activeTab === "endpoints" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar list of endpoints */}
            <div className="lg:col-span-1 space-y-2">
              <span className="text-xs font-bold text-zinc-400 dark:text-[#8A8A94] uppercase tracking-widest block mb-4">
                API Endpoints
              </span>
              {Object.keys(ENDPOINTS).map((key) => {
                const ep = ENDPOINTS[key];
                const isActive = activeEndpoint === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveEndpoint(key as "encrypt" | "decrypt" | "hash" | "algorithms")}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "bg-teal-50/50 dark:bg-teal-950/10 border-teal-500/30 dark:border-[#00C2AE]/30 text-teal-700 dark:text-[#00C2AE] shadow-inner"
                        : "bg-white dark:bg-[#101013] border-zinc-200/80 dark:border-[#2A2A31]/50 text-zinc-650 dark:text-[#B3B3B8] hover:border-zinc-300 dark:hover:border-[#2A2A31]"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-[#8A8A94]">
                        {key}
                      </span>
                      <span className="font-mono text-xs mt-1 truncate">
                        {ep.path}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      ep.method === "POST"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {ep.method}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main content details for the active endpoint */}
            <div className="lg:col-span-3 space-y-8">
              <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                    ENDPOINTS[activeEndpoint].method === "POST"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {ENDPOINTS[activeEndpoint].method}
                  </span>
                  <code className="font-mono text-base font-bold text-zinc-950 dark:text-white">
                    {ENDPOINTS[activeEndpoint].path}
                  </code>
                </div>
                <p className="mt-4 text-sm text-zinc-600 dark:text-[#B3B3B8] leading-relaxed">
                  {ENDPOINTS[activeEndpoint].description}
                </p>

                {/* Parameters section */}
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
                    Request Parameters
                  </h3>

                  {ENDPOINTS[activeEndpoint].parameters.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-zinc-200 dark:divide-[#2A2A31] text-xs">
                        <thead>
                          <tr className="text-zinc-400 dark:text-[#8A8A94] text-left">
                            <th className="pb-3 font-semibold">Parameter</th>
                            <th className="pb-3 font-semibold">Type</th>
                            <th className="pb-3 font-semibold">Required</th>
                            <th className="pb-3 font-semibold">Default</th>
                            <th className="pb-3 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-[#2A2A31]/50 text-zinc-650 dark:text-[#B3B3B8]">
                          {ENDPOINTS[activeEndpoint].parameters.map((param) => (
                            <tr key={param.name}>
                              <td className="py-3.5 font-mono font-bold text-teal-650 dark:text-teal-400">{param.name}</td>
                              <td className="py-3.5 font-mono text-purple-600 dark:text-purple-400">{param.type}</td>
                              <td className="py-3.5">
                                {param.required ? (
                                  <span className="text-red-500 font-semibold">Yes</span>
                                ) : (
                                  <span>No</span>
                                )}
                              </td>
                              <td className="py-3.5 font-mono">{param.default}</td>
                              <td className="py-3.5 max-w-xs">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 dark:text-[#8A8A94] py-2">
                      No query or body parameters required.
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Payload examples */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Request representation */}
                <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-[#16161A] p-5">
                  <div className="flex items-center justify-between border-b border-[#2A2A31] pb-3 mb-4">
                    <span className="text-xs font-semibold text-[#8A8A94] tracking-wider uppercase flex items-center gap-1.5">
                      <FileCode size={13} className="text-[#00C2AE]" />
                      Sample Request Body
                    </span>
                    <button
                      onClick={() => copyToClipboard(
                        activeEndpoint === "algorithms"
                          ? "None"
                          : JSON.stringify({
                              cipherId: activeEndpoint === "hash" ? "sha256" : "caesar",
                              input: activeEndpoint === "hash" ? "abc" : "Hello, World!",
                              key: activeEndpoint === "hash" ? "" : "3",
                              options: {}
                            }, null, 2),
                        "samplereq"
                      )}
                      className="text-[#8A8A94] hover:text-[#00C2AE] transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSection === "samplereq" ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre">
                    {activeEndpoint === "algorithms" ? (
                      `// GET /api/v1/algorithms\n// Body parameters are not supported.`
                    ) : (
                      JSON.stringify({
                        cipherId: activeEndpoint === "hash" ? "sha256" : "caesar",
                        input: activeEndpoint === "hash" ? "abc" : "Hello, World!",
                        key: activeEndpoint === "hash" ? "" : "3",
                        options: {}
                      }, null, 2)
                    )}
                  </pre>
                </div>

                {/* Response representation */}
                <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-[#16161A] p-5">
                  <div className="flex items-center justify-between border-b border-[#2A2A31] pb-3 mb-4">
                    <span className="text-xs font-semibold text-[#8A8A94] tracking-wider uppercase flex items-center gap-1.5">
                      <Database size={13} className="text-teal-400" />
                      Sample JSON Response
                    </span>
                  </div>
                  <pre className="font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre">
                    {activeEndpoint === "algorithms" ? (
                      JSON.stringify({
                        success: true,
                        payload: {
                          count: 1,
                          algorithms: [
                            { id: "caesar", name: "Caesar Cipher", category: "classical", securityStatus: "broken" }
                          ]
                        },
                        timings: { durationMs: 4.8 }
                      }, null, 2)
                    ) : activeEndpoint === "hash" ? (
                      JSON.stringify({
                        success: true,
                        payload: {
                          output: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
                          outputEncoding: "hex",
                          metadata: { name: "SHA-256", securityStatus: "secure" }
                        },
                        timings: { durationMs: 0.15 }
                      }, null, 2)
                    ) : (
                      JSON.stringify({
                        success: true,
                        payload: {
                          output: "KHOOR ZRUOG",
                          outputEncoding: "utf8",
                          steps: [
                            { index: 0, label: "Key setup", inputState: "KEY: 3", outputState: "SHIFT: +3", note: "Each letter shifted 3 positions." }
                          ],
                          metadata: { name: "Caesar Cipher", securityStatus: "broken", rounds: 3 }
                        },
                        timings: { durationMs: 1.2 }
                      }, null, 2)
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Interactive Sandbox */}
        {activeTab === "sandbox" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Input Configuration Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 shadow-sm">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white mb-6 flex items-center gap-2">
                  <Sliders size={18} className="text-teal-500 dark:text-[#00C2AE]" />
                  Payload Configurator
                </h3>

                <div className="space-y-4">
                  {/* Select Route type */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-[#8A8A94] uppercase tracking-wider mb-2">
                      API Endpoint
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["encrypt", "decrypt", "hash"] as const).map((method) => (
                        <button
                          key={method}
                          onClick={() => {
                            setActiveEndpoint(method);
                            setTerminalResponse(null);
                            if (method === "hash") {
                              setSandboxCipher("sha256");
                              setSandboxInput("CryptoViz API Rules");
                              setSandboxKey("");
                            } else {
                              setSandboxCipher("caesar");
                              setSandboxInput("Hello, World!");
                              setSandboxKey("3");
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize ${
                            activeEndpoint === method
                              ? "bg-teal-50/50 dark:bg-teal-950/20 border-teal-500/35 text-teal-700 dark:text-[#00C2AE]"
                              : "bg-zinc-50 dark:bg-black/30 border-zinc-200 dark:border-[#2A2A31]/50 text-zinc-500 dark:text-[#8A8A94]"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Choose Algorithm */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-[#8A8A94] uppercase tracking-wider mb-2">
                      Cryptographic Algorithm
                    </label>
                    <select
                      value={sandboxCipher}
                      onChange={(e) => {
                        const cipher = e.target.value;
                        setSandboxCipher(cipher);
                        setTerminalResponse(null);
                        if (cipher === "caesar") {
                          setSandboxInput("Hello, World!");
                          setSandboxKey("3");
                        } else if (cipher === "aes") {
                          setSandboxInput("00112233445566778899aabbccddeeff");
                          setSandboxKey("000102030405060708090a0b0c0d0e0f");
                          setSandboxHexMode(true);
                        } else if (cipher === "sha256") {
                          setSandboxInput("CryptoViz API Rules");
                          setSandboxKey("");
                        } else if (cipher === "rsa") {
                          setSandboxInput("CRYPTO");
                          setSandboxKey("61,53,17");
                        }
                      }}
                      className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31] rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
                    >
                      {activeEndpoint === "hash" ? (
                        <>
                          <option value="sha256">SHA-256 (Hash)</option>
                        </>
                      ) : (
                        <>
                          <option value="caesar">Caesar (Classical Shift)</option>
                          <option value="aes">AES (Symmetric Block)</option>
                          <option value="rsa">RSA (Asymmetric Small-Prime)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Plaintext / Ciphertext Input */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-[#8A8A94] uppercase tracking-wider mb-2">
                      Payload: <code className="font-mono text-teal-650 dark:text-teal-400">input</code>
                    </label>
                    <textarea
                      value={sandboxInput}
                      onChange={(e) => {
                        setSandboxInput(e.target.value);
                        setTerminalResponse(null);
                      }}
                      rows={3}
                      className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31] rounded-lg p-3 text-sm font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
                      placeholder="Enter string data to process..."
                    />
                  </div>

                  {/* Key Parameter - Only show if not algorithms or single hashing functions */}
                  {sandboxCipher !== "sha256" && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 dark:text-[#8A8A94] uppercase tracking-wider mb-2">
                        Payload: <code className="font-mono text-teal-650 dark:text-teal-400">key</code>
                      </label>
                      <input
                        type="text"
                        value={sandboxKey}
                        onChange={(e) => {
                          setSandboxKey(e.target.value);
                          setTerminalResponse(null);
                        }}
                        className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31] rounded-lg px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
                        placeholder={
                          sandboxCipher === "aes"
                            ? "32-character Hex AES Key"
                            : sandboxCipher === "rsa"
                            ? "p,q,e (e.g. 61,53,17)"
                            : "Caesar shift key (e.g. 3)"
                        }
                      />
                    </div>
                  )}

                  {/* Advanced settings */}
                  {sandboxCipher === "aes" && (
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-[#2A2A31]/50 pt-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">
                          Hex Input Mode
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-[#8A8A94]">
                          Parse plaintext as raw hexadecimal bytes.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={sandboxHexMode}
                        onChange={(e) => setSandboxHexMode(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                      />
                    </div>
                  )}

                  <button
                    onClick={executeSandboxRequest}
                    disabled={terminalLoading}
                    className="w-full rounded-xl bg-teal-500 hover:bg-teal-600 dark:bg-[#00C2AE] dark:hover:bg-[#14D8C2] disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white dark:text-black font-semibold py-3 px-4 shadow-sm hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-6"
                  >
                    {terminalLoading ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Processing request...</span>
                      </>
                    ) : (
                      <>
                        <TerminalIcon size={16} />
                        <span>Send Sandbox Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Code generation dashboard */}
              <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                    Client Integration Code
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* cURL Snippet */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-900 p-4 relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#8A8A94] uppercase font-mono">
                        Shell / cURL
                      </span>
                      <button
                        onClick={() => copyToClipboard(requestSnippets.curl, "curl")}
                        className="text-[#8A8A94] hover:text-white transition-colors"
                      >
                        {copiedSection === "curl" ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                      {requestSnippets.curl}
                    </pre>
                  </div>

                  {/* JS Fetch Snippet */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-900 p-4 relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#8A8A94] uppercase font-mono">
                        JavaScript / Fetch
                      </span>
                      <button
                        onClick={() => copyToClipboard(requestSnippets.javascript, "js")}
                        className="text-[#8A8A94] hover:text-white transition-colors"
                      >
                        {copiedSection === "js" ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                      {requestSnippets.javascript}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Sandbox Response Terminal */}
            <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
              <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-[#16161A] p-6 flex-1 flex flex-col font-mono text-xs text-zinc-350 shadow-lg relative overflow-hidden">
                {/* Header of Terminal */}
                <div className="flex items-center justify-between border-b border-[#2A2A31] pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                      <Globe size={11} className="text-teal-500" />
                      Live Terminal Console
                    </span>
                  </div>

                  {latency !== null && (
                    <span className="text-[10px] text-zinc-400">
                      Latency: <strong className="text-[#00C2AE]">{latency}ms</strong>
                    </span>
                  )}
                </div>

                {/* HTTP Status & Headers */}
                {terminalStatus && (
                  <div className="mb-4 shrink-0 border-b border-[#2A2A31]/50 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-zinc-500">HTTP/1.1</span>
                      <span className={`font-bold ${
                        terminalStatus.startsWith("200") ? "text-emerald-500" : "text-rose-500"
                      }`}>
                        {terminalStatus}
                      </span>
                    </div>
                    <div className="space-y-1 text-zinc-500 text-[10px]">
                      {Object.entries(terminalHeaders).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-zinc-400">{key}:</span> {val}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body Content */}
                <div className="flex-1 overflow-auto max-h-[500px]">
                  {terminalLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 py-16 text-zinc-500">
                      <RefreshCw size={24} className="animate-spin text-teal-500" />
                      <span className="animate-pulse">Awaiting handshake response from servers...</span>
                    </div>
                  ) : terminalResponse ? (
                    <div className="relative">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(terminalResponse, null, 2), "terminal")}
                        className="absolute right-0 top-0 text-[#8A8A94] hover:text-white transition-colors cursor-pointer"
                        title="Copy Response payload"
                      >
                        {copiedSection === "terminal" ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <pre className="text-zinc-300 font-mono text-[11px] leading-relaxed whitespace-pre select-all pr-8">
                        {JSON.stringify(terminalResponse, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-500 py-16 select-none">
                      <TerminalIcon size={32} className="text-[#2A2A31] animate-bounce" />
                      <span className="text-center max-w-xs">
                        Configure the parameters on the left and trigger a payload delivery to view full HTTP response structures.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: Error Reference */}
        {activeTab === "errors" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6 lg:col-span-1">
              <span className="text-xs font-bold text-zinc-400 dark:text-[#8A8A94] uppercase tracking-widest block">
                Standard Error Enums
              </span>

              <div className="space-y-2">
                {(["UNAUTHORIZED", "INVALID_KEY", "BUDGET_EXCEEDED"] as const).map((errType) => (
                  <button
                    key={errType}
                    onClick={() => setSelectedError(errType)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedError === errType
                        ? "bg-rose-500/5 border-rose-500/30 text-rose-500"
                        : "bg-white dark:bg-[#101013] border-zinc-200/80 dark:border-[#2A2A31]/50 text-zinc-650 dark:text-[#B3B3B8] hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span className="font-mono text-xs font-bold">{errType}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error JSON payload terminal view */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-[#16161A] p-6 font-mono text-xs text-zinc-300 shadow-md">
                <div className="flex items-center gap-2 border-b border-[#2A2A31] pb-3 mb-4 text-zinc-500">
                  <span>HTTP/1.1</span>
                  <span className="font-bold text-rose-500">
                    {errorMockPayloads[selectedError].status}
                  </span>
                </div>

                <pre className="overflow-x-auto select-all leading-relaxed whitespace-pre">
                  {JSON.stringify(errorMockPayloads[selectedError].body, null, 2)}
                </pre>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6">
                <h4 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider mb-2">
                  Handling Errors in Clients
                </h4>
                <p className="text-sm text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
                  All error payloads return a standard HTTP non-2xx status code alongside a structured error object. In your wrapper libraries, inspect `error.code` first to programmatically identify issues before parsing the user-facing `message` string.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 4: SDK Reference */}
        {activeTab === "sdk" && (
          <div className="space-y-8">
            {/* Library installation */}
            <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 shadow-sm">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white mb-2 flex items-center gap-2">
                <Code size={18} className="text-teal-500 dark:text-[#00C2AE]" />
                Direct Library Integration (NPM / YARN)
              </h3>
              <p className="text-sm text-zinc-500 dark:text-[#8A8A94] leading-relaxed mb-6">
                If you are building code inside our ecosystem, you do not need to make remote network calls. You can import cryptographic engines directly from the `cryptoviz` modules to run calculations client-side inside Web Workers or main threads.
              </p>

              {/* Install code block */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-900 p-4 flex items-center justify-between">
                <code className="font-mono text-xs text-teal-400 select-all">
                  npm install @cryptoviz/core
                </code>
                <button
                  onClick={() => copyToClipboard("npm install @cryptoviz/core", "install")}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  {copiedSection === "install" ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Code Integration worked example */}
            <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 shadow-sm">
              <h4 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider mb-4">
                TypeScript Worked Integration Example
              </h4>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-900 p-5 relative overflow-x-auto">
                <button
                  onClick={() => copyToClipboard(
                    `import { encrypt, decrypt } from "@cryptoviz/core/cipher/classical/caesar";\n\n// 1. Process plaintext with instrumented steps tracker\nconst result = encrypt("HELLO WORLD", "3", { instrument: true });\n\nconsole.log(result.output); // "KHOOR ZRUOG"\nconsole.log(result.durationMs); // Execution latency in ms\n\n// 2. Iterate through visualization steps\nresult.steps.forEach((step) => {\n  console.log(\`Step \${step.index} [\${step.label}]: \${step.inputState} -> \${step.outputState}\`);\n  console.log(\`Reasoning: \${step.note}\`);\n});`,
                    "ts-example"
                  )}
                  className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors"
                >
                  {copiedSection === "ts-example" ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
                <pre className="font-mono text-xs text-zinc-350 leading-relaxed">
{`import { encrypt, decrypt } from "@cryptoviz/core/cipher/classical/caesar";

// 1. Process plaintext with instrumented steps tracker
const result = encrypt("HELLO WORLD", "3", { instrument: true });

console.log(result.output); // "KHOOR ZRUOG"
console.log(result.durationMs); // Execution latency in ms

// 2. Iterate through visualization steps
result.steps.forEach((step) => {
  console.log(\`Step \${step.index} [\${step.label}]: \${step.inputState} -> \${step.outputState}\`);
  console.log(\`Reasoning: \${step.note}\`);
});`}
                </pre>
              </div>
            </div>

            {/* Data Type Definition schema lists */}
            <div className="rounded-2xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 shadow-sm">
              <h4 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider mb-4">
                Core TypeScript Interfaces
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-zinc-200 dark:border-[#2A2A31] bg-[#16161A] p-4">
                  <span className="text-xs font-bold text-[#8A8A94] uppercase font-mono block mb-3">
                    interface CipherResult
                  </span>
                  <pre className="font-mono text-[11px] text-zinc-300 leading-relaxed">
{`export interface CipherResult {
  output: string;
  outputEncoding: "utf8" | "hex" | "base64" | "binary";
  steps: CipherStep[];
  metadata: CipherMetadata;
  durationMs: number;
}`}
                  </pre>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-[#2A2A31] bg-[#16161A] p-4">
                  <span className="text-xs font-bold text-[#8A8A94] uppercase font-mono block mb-3">
                    interface CipherStep
                  </span>
                  <pre className="font-mono text-[11px] text-zinc-300 leading-relaxed">
{`export interface CipherStep {
  index: number;
  label: string;
  sublabel?: string;
  inputState: string;  // Hex state representation
  outputState: string; // Hex state representation
  highlight?: number[];
  matrix?: string[][]; // For Grid representations
  note: string;        // Explanatory breakdown text
  isMilestone?: boolean;
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Embedded footer representation to preserve navigation flows */}
      <footer className="border-t border-zinc-200/50 dark:border-[#2A2A31]/50 bg-zinc-100/80 dark:bg-[#101013]/40 mt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 dark:text-[#8A8A94]">
          CryptoViz API Documentation Hub. Released under MIT license.
        </div>
      </footer>
    </div>
  );
}
