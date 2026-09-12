'use client'

import React, { useState } from 'react'
import Link from 'next/link'

type ProtocolStep = {
  title: string
  description: string
  sender?: string
  receiver?: string
  message?: string
}

type Protocol = {
  id: string
  name: string
  purpose: string
  actors: string[]
  concepts: string[]
  differences: string
  steps: ProtocolStep[]
}

const protocols: Protocol[] = [
  {
    id: 'openpgp',
    name: 'OpenPGP (Pretty Good Privacy)',
    purpose: 'End-to-end email, file, and message encryption & digital signing standard (RFC 4880 / RFC 9580).',
    actors: ['Alice (Sender)', 'Bob (Recipient)'],
    concepts: ['Sign-Compress-Encrypt', 'Packet Hierarchy (Tags)', 'Radix-64 ASCII Armor', 'SEIPD & MDC'],
    differences: 'Combines asymmetric signing, DEFLATE payload compression, and symmetric session key encryption in a canonical multi-stage pipeline.',
    steps: [
      { title: 'Digital Signature (Sign)', description: 'Alice hashes the plaintext payload and computes a digital signature using her private key.', sender: 'Alice', receiver: 'Alice', message: 'Signature Packet (Tag 2)' },
      { title: 'Payload Compression (Compress)', description: 'Plaintext and signature packets are bundled and compressed with DEFLATE/ZIP to remove statistical redundancy.', sender: 'Alice', receiver: 'Alice', message: 'Compressed Data (Tag 8)' },
      { title: 'Symmetric & Asymmetric Encryption (Encrypt)', description: 'A random symmetric session key is generated to encrypt compressed data (SEIPD Tag 18). The session key is encrypted with Bob\'s Public Key (PKESK Tag 1).', sender: 'Alice', receiver: 'Bob', message: 'PKESK + SEIPD Ciphertext' },
      { title: 'Decryption & Verification (Decrypt)', description: 'Bob decrypts the session key using his private key, decrypts and decompresses the payload, and authenticates Alice\'s signature.', sender: 'Bob', receiver: 'Bob', message: 'MDC Verified & Valid Signature' }
    ]
  },
  {
    id: 'tls',
    name: 'TLS (Transport Layer Security)',
    purpose: 'Secure communication over a computer network, widely used for web traffic (HTTPS).',
    actors: ['Client (Browser)', 'Server'],
    concepts: ['Handshake', 'X.509 Certificates', 'Forward Secrecy', 'AEAD'],
    differences: 'Typically only authenticates the server (via Certificate Authorities) rather than both parties, unlike SSH.',
    steps: [
      { title: 'Client Hello', description: 'Client sends supported cipher suites and a random byte string.', sender: 'Client', receiver: 'Server', message: 'ClientHello + Random_C' },
      { title: 'Server Hello & Certificate', description: 'Server chooses a cipher, sends its own random string, and its digital certificate.', sender: 'Server', receiver: 'Client', message: 'ServerHello + Cert + Random_S' },
      { title: 'Key Exchange', description: 'Parties exchange parameters to establish a shared secret (e.g., using ECDHE).', sender: 'Both', receiver: 'Both', message: 'Key Exchange Parameters' },
      { title: 'Finished', description: 'Both sides verify the handshake integrity and switch to encrypted communication.', sender: 'Both', receiver: 'Both', message: 'Encrypted "Finished" MAC' }
    ]
  },
  {
    id: 'ssh',
    name: 'SSH (Secure Shell)',
    purpose: 'Secure command-line access, remote execution, and file transfer.',
    actors: ['SSH Client', 'SSH Server'],
    concepts: ['Trust on First Use (TOFU)', 'Public Key Authentication', 'Port Forwarding'],
    differences: 'Authenticates both client and server by default. Uses TOFU instead of a central Certificate Authority system.',
    steps: [
      { title: 'Version Exchange', description: 'Client and server agree on the SSH protocol version.', sender: 'Both', receiver: 'Both', message: 'Version String' },
      { title: 'Algorithm Negotiation', description: 'Exchange supported key exchange, encryption, and MAC algorithms.', sender: 'Both', receiver: 'Both', message: 'KEXINIT' },
      { title: 'Key Exchange', description: 'Establish a shared secret and verify the server\'s host key (TOFU).', sender: 'Both', receiver: 'Both', message: 'ECDH / HostKey signature' },
      { title: 'User Authentication', description: 'Client authenticates to the server (e.g., via public key or password) over the newly encrypted channel.', sender: 'Client', receiver: 'Server', message: 'Auth Request (Encrypted)' }
    ]
  },
  {
    id: 'signal',
    name: 'Signal Protocol',
    purpose: 'End-to-end encrypted (E2EE) asynchronous messaging.',
    actors: ['Alice', 'Bob', 'Key Server'],
    concepts: ['Double Ratchet', 'X3DH (Extended Triple Diffie-Hellman)', 'Post-Compromise Security'],
    differences: 'Designed for asynchronous communication (Bob can be offline). Provides "healing" (Post-Compromise Security) if a key is briefly compromised.',
    steps: [
      { title: 'Registration', description: 'Users generate identity keys and pre-keys, and upload public halves to the server.', sender: 'Alice/Bob', receiver: 'Key Server', message: 'Identity & Pre-Keys' },
      { title: 'Session Setup (X3DH)', description: 'Alice fetches Bob\'s pre-keys from the server and computes a shared secret asynchronously.', sender: 'Alice', receiver: 'Key Server', message: 'Fetch Bob\'s Pre-Keys' },
      { title: 'Initial Message', description: 'Alice sends the first encrypted message along with her ephemeral public key to establish the session.', sender: 'Alice', receiver: 'Bob', message: 'Message + Ephemeral Key' },
      { title: 'Double Ratchet', description: 'Keys are rotated with every message sent/received, providing forward and backward secrecy.', sender: 'Both', receiver: 'Both', message: 'Ratcheted Ciphertext' }
    ]
  },
  {
    id: 'jwt',
    name: 'JWT (JSON Web Token)',
    purpose: 'Stateless authentication and authorization claims representation.',
    actors: ['Client', 'Authorization Server', 'Resource Server'],
    concepts: ['Stateless Auth', 'Base64Url', 'JWS (Signatures)', 'JWE (Encryption)'],
    differences: 'It is a token format, not a transport protocol. By default (JWS), the contents are readable by anyone, only the signature prevents tampering.',
    steps: [
      { title: 'Authentication', description: 'Client proves identity (e.g., username/password) to the Auth Server.', sender: 'Client', receiver: 'Auth Server', message: 'Credentials' },
      { title: 'Token Issuance', description: 'Auth Server creates a JWT, signs it, and returns it to the client.', sender: 'Auth Server', receiver: 'Client', message: 'Signed JWT' },
      { title: 'Resource Request', description: 'Client sends the JWT in the Authorization header to access an API.', sender: 'Client', receiver: 'Resource Server', message: 'HTTP Request + Bearer JWT' },
      { title: 'Verification', description: 'Resource Server verifies the JWT signature locally without needing to contact the Auth Server.', sender: 'Resource Server', receiver: 'Resource Server', message: 'Verify Signature' }
    ]
  },
  {
    id: 'https',
    name: 'HTTPS (HTTP over TLS)',
    purpose: 'Secure web browsing and API communication.',
    actors: ['Web Browser', 'Web Server'],
    concepts: ['HSTS', 'SNI (Server Name Indication)', 'Mixed Content', 'Application-Layer Protocol Negotiation (ALPN)'],
    differences: 'Not a standalone protocol, but the composition of HTTP layered on top of a TLS tunnel.',
    steps: [
      { title: 'DNS Resolution', description: 'Browser resolves the domain name to an IP address.', sender: 'Browser', receiver: 'DNS', message: 'DNS Query' },
      { title: 'TCP Handshake', description: 'Establish a reliable connection (SYN, SYN-ACK, ACK).', sender: 'Browser', receiver: 'Server', message: 'TCP Setup' },
      { title: 'TLS Handshake', description: 'Establish the secure TLS tunnel (as explored in the TLS section).', sender: 'Browser', receiver: 'Server', message: 'TLS Handshake' },
      { title: 'HTTP Request/Response', description: 'Standard HTTP traffic is sent through the encrypted tunnel.', sender: 'Browser', receiver: 'Server', message: 'Encrypted HTTP Traffic' }
    ]
  },
  {
    id: 'webauthn',
    name: 'WebAuthn & Passkeys',
    purpose: 'Standard for passwordless public-key authentication bound to origins, preventing phishing.',
    actors: ['Browser (Client)', 'Authenticator', 'RP Server'],
    concepts: ['Asymmetric Cryptography (P-256)', 'Origin Binding', 'User Presence/Verification', 'CBOR/COSE encoding'],
    differences: 'Unlike credentials sent to a server (passwords/tokens), WebAuthn private keys never leave the authenticator. Signatures are bound to the domain name, making phishing attacks impossible.',
    steps: [
      { title: 'Challenge Creation', description: 'The Relying Party (Server) generates a cryptographically secure random challenge and sends registration/assertion options to the client.', sender: 'RP Server', receiver: 'Browser (Client)', message: 'Challenge + Options' },
      { title: 'User Authorization', description: 'The user verifies their identity (PIN, TouchID, FaceID) on the authenticator device to unlock the cryptographic key.', sender: 'Browser (Client)', receiver: 'Authenticator', message: 'User Consent (Biometric/PIN)' },
      { title: 'Credential Operation', description: 'The authenticator generates a keypair (for registration) or retrieves a private key (for assertion) to sign the challenge.', sender: 'Authenticator', receiver: 'Browser (Client)', message: 'Signed Challenge' },
      { title: 'Verification & Auth', description: 'The client forwards the signed response to the server. The server verifies the signature, challenge, and origin to complete authentication.', sender: 'Browser (Client)', receiver: 'RP Server', message: 'Assertion/Attestation Signature' }
    ]
  }
]

export default function ProtocolExplorer() {
  const [activeTab, setActiveTab] = useState<string>('tls')
  const [activeStep, setActiveStep] = useState<number>(0)

  const activeProtocol = protocols.find(p => p.id === activeTab) || protocols[0]

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    setActiveStep(0)
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="w-full xl:w-64 shrink-0">
        <nav className="flex xl:flex-col overflow-x-auto xl:overflow-visible gap-2 pb-4 xl:pb-0 scrollbar-hide border-b xl:border-b-0 xl:border-r border-zinc-200 dark:border-zinc-800 pr-0 xl:pr-4">
          {protocols.map(p => (
            <button
              key={p.id}
              onClick={() => handleTabChange(p.id)}
              className={`whitespace-nowrap px-4 py-3 xl:py-2.5 rounded-xl text-left text-sm font-semibold transition-all
                ${activeTab === p.id 
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-white'
                }`}
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">
        
        {/* Header section */}
        <header className="space-y-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {activeProtocol.name}
            </h2>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {activeProtocol.purpose}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex-1 min-w-[200px]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">Actors</h3>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{activeProtocol.actors.join(', ')}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex-1 min-w-[200px]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">Key Concepts</h3>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{activeProtocol.concepts.join(', ')}</p>
            </div>
          </div>
        </header>

        {/* Interactive Flow */}
        <section className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Protocol Flow</h3>
            <div className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
              Step {activeStep + 1} of {activeProtocol.steps.length}
            </div>
          </div>
          
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Steps List */}
            <div className="space-y-3 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10 rounded-full" />
              
              {activeProtocol.steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full flex items-start gap-4 text-left p-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-teal-500
                    ${activeStep === idx 
                      ? 'bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700' 
                      : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'
                    }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                    ${activeStep === idx 
                      ? 'border-teal-500 bg-white text-teal-600 dark:bg-zinc-900 dark:text-teal-400 shadow-sm shadow-teal-500/20' 
                      : activeStep > idx 
                        ? 'border-teal-500 bg-teal-500 text-white' 
                        : 'border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${activeStep === idx ? 'text-teal-700 dark:text-teal-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {step.title}
                    </h4>
                    {activeStep === idx && (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Sequence Diagram Visualizer */}
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-4 sm:p-6 border border-zinc-100 dark:border-zinc-800/50">
               <div className="w-full max-w-sm flex items-center justify-between mb-8">
                 <div className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm font-semibold text-sm">
                   {activeProtocol.steps[activeStep].sender || activeProtocol.actors[0]}
                 </div>
                 <div className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm font-semibold text-sm">
                   {activeProtocol.steps[activeStep].receiver || activeProtocol.actors[1] || 'Network'}
                 </div>
               </div>
               
               {/* Arrow / Message display */}
               <div className="relative w-full max-w-sm h-16 flex items-center justify-center">
                  <div className="absolute inset-x-4 h-0.5 bg-teal-300 dark:bg-teal-700">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 -mt-0.5 border-4 border-transparent border-l-teal-300 dark:border-l-teal-700" />
                  </div>
                  <div className="relative z-10 bg-zinc-50 dark:bg-zinc-900 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800 text-xs font-mono font-bold text-teal-700 dark:text-teal-400 shadow-sm animate-pulse">
                    {activeProtocol.steps[activeStep].message || 'Data Exchange'}
                  </div>
               </div>
               
               <div className="mt-auto pt-8 flex gap-3">
                 <button 
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="px-4 py-2 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                 >
                   Previous
                 </button>
                 <button 
                  onClick={() => setActiveStep(Math.min(activeProtocol.steps.length - 1, activeStep + 1))}
                  disabled={activeStep === activeProtocol.steps.length - 1}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                 >
                   Next Step
                 </button>
               </div>
            </div>
            
          </div>
        </section>

        {/* Differences / Comparison */}
        <section className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6">
          <div className="flex gap-4 items-start">
            <div className="mt-1 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full text-blue-600 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">How it compares</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200/80 leading-relaxed">
                {activeProtocol.differences}
              </p>
              {activeProtocol.id === 'webauthn' && (
                <div className="mt-4">
                  <Link
                    href="/protocols/webauthn"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
                  >
                    Go to WebAuthn Playground
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
