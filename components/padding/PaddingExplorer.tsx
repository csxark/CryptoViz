'use client'

import { useState } from 'react'
import PaddingVisualizer, { PaddingSchemeId } from './PaddingVisualizer'

interface SchemeData {
  id: PaddingSchemeId
  name: string
  type: 'Symmetric' | 'Asymmetric'
  purpose: string
  usedIn: string
  compatibility: string
  generation: string
  security: string
  useCases: string
  limitations: string
}

const SCHEMES: SchemeData[] = [
  {
    id: 'pkcs7',
    name: 'PKCS#7',
    type: 'Symmetric',
    purpose: 'To pad messages to a multiple of the block size for block ciphers.',
    usedIn: 'AES (CBC, ECB), DES',
    compatibility: 'Encryption only',
    generation: 'Appends N bytes of value N. If the message is already a multiple of the block size, a full block of padding is added (e.g., 16 bytes of 0x10).',
    security: 'Deterministic. Vulnerable to padding oracle attacks (e.g., POODLE) if used in CBC mode without proper MAC-then-Encrypt or Encrypt-then-MAC authentication.',
    useCases: 'Legacy APIs, older TLS versions, basic symmetric encryption.',
    limitations: 'Does not provide integrity. Should be avoided in modern designs in favor of authenticated encryption modes like GCM, which do not require padding.'
  },
  {
    id: 'oaep',
    name: 'RSA-OAEP',
    type: 'Asymmetric',
    purpose: 'To provide randomized padding for RSA encryption, ensuring IND-CCA2 security.',
    usedIn: 'RSA Encryption (PKCS#1 v2.x)',
    compatibility: 'Encryption only',
    generation: 'Uses a Hash function (e.g., SHA-256) and a Mask Generation Function (MGF1) in a Feistel network structure to randomize and mask the plaintext before RSA encryption.',
    security: 'Highly secure (IND-CCA2). Prevents chosen-ciphertext attacks by ensuring that encrypting the same message twice yields different ciphertexts.',
    useCases: 'Key transport (e.g., encrypting a symmetric AES key), modern RSA encryption.',
    limitations: 'Only encrypts small amounts of data (Message length must be ≤ RSA Key Size - 2*HashLen - 2). Complex to implement correctly.'
  },
  {
    id: 'pss',
    name: 'RSA-PSS',
    type: 'Asymmetric',
    purpose: 'To provide randomized padding for RSA digital signatures.',
    usedIn: 'RSA Signatures (PKCS#1 v2.x)',
    compatibility: 'Signatures only',
    generation: 'Combines the message hash, a random salt, and specific padding bytes to generate a randomized masked structure before applying the RSA private key.',
    security: 'Provably secure under the random oracle model. Prevents existential forgery attacks.',
    useCases: 'Digital certificates (X.509), document signing, modern TLS handshakes.',
    limitations: 'Slightly larger overhead than deterministic signatures (due to the salt).'
  },
  {
    id: 'pkcs1_v15_enc',
    name: 'PKCS#1 v1.5 (Enc)',
    type: 'Asymmetric',
    purpose: 'To pad messages for RSA encryption (older standard).',
    usedIn: 'Legacy RSA Encryption',
    compatibility: 'Encryption only',
    generation: 'Starts with 0x00 0x02, followed by non-zero random bytes, a 0x00 separator, and the plaintext message.',
    security: 'Vulnerable to Bleichenbacher’s attack (a type of padding oracle) if the decrypter leaks whether the padding was valid.',
    useCases: 'Backwards compatibility with older protocols (e.g., old TLS).',
    limitations: 'Highly discouraged for new applications due to known vulnerabilities.'
  },
  {
    id: 'pkcs1_v15_sig',
    name: 'PKCS#1 v1.5 (Sig)',
    type: 'Asymmetric',
    purpose: 'To pad message hashes for RSA signatures (older standard).',
    usedIn: 'Legacy RSA Signatures',
    compatibility: 'Signatures only',
    generation: 'Starts with 0x00 0x01, followed by 0xFF padding bytes, a 0x00 separator, and the ASN.1 encoded hash of the message.',
    security: 'Deterministic. Generally secure if implemented correctly, but vulnerable to specific parsing bugs (e.g., BERserk attack) if the ASN.1 parser is flawed.',
    useCases: 'Still widely used in many legacy X.509 certificates and JWTs (RS256).',
    limitations: 'Not provably secure like PSS. Requires strict parsing.'
  },
  {
    id: 'none',
    name: 'No Padding',
    type: 'Asymmetric',
    purpose: 'Raw encryption without any padding ("Textbook RSA").',
    usedIn: 'Educational demonstrations only.',
    compatibility: 'Encryption & Signatures',
    generation: 'The message is directly converted to an integer and used in the RSA mathematical operation.',
    security: 'Completely insecure. Deterministic, malleable, and highly vulnerable to chosen-plaintext and algebraic attacks.',
    useCases: 'DO NOT USE. Exists only to demonstrate why padding is absolutely necessary.',
    limitations: 'Trivial to break.'
  }
]

export default function PaddingExplorer() {
  const [activeTab, setActiveTab] = useState<PaddingSchemeId>('pkcs7')
  const [inputString, setInputString] = useState('SECRET')

  const activeScheme = SCHEMES.find(s => s.id === activeTab)!

  return (
    <section aria-labelledby="padding-explorer-heading" className="space-y-8">
      <h2 id="padding-explorer-heading" className="sr-only">Padding Scheme Comparison</h2>

      {/* Tabs Navigation */}
      <nav 
        role="tablist" 
        aria-label="Select Padding Scheme"
        className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800"
      >
        {SCHEMES.map(scheme => {
          const isSelected = activeTab === scheme.id
          return (
            <button
              key={scheme.id}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`panel-${scheme.id}`}
              id={`tab-${scheme.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(scheme.id)}
              className={`
                px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 outline-none
                ${isSelected 
                  ? 'bg-teal-500 text-white dark:bg-teal-600' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }
              `}
            >
              {scheme.name}
            </button>
          )
        })}
      </nav>

      {/* Tab Content */}
      <div 
        id={`panel-${activeScheme.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeScheme.id}`}
        className="grid lg:grid-cols-2 gap-8"
      >
        {/* Left Column: Information */}
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
              {activeScheme.name}
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {activeScheme.type}
              </span>
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {activeScheme.purpose}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-zinc-200 rounded-lg overflow-hidden dark:border-zinc-800">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                    <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 w-1/3">Used In</th>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{activeScheme.usedIn}</td>
                  </tr>
                  <tr>
                    <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Compatibility</th>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{activeScheme.compatibility}</td>
                  </tr>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                    <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Security</th>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{activeScheme.security}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">How it is generated</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{activeScheme.generation}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Use Cases</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{activeScheme.useCases}</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Limitations</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{activeScheme.limitations}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visualizer */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm dark:bg-[#0a0a0a] dark:border-zinc-800">
          <h3 className="text-lg font-bold mb-4">Visual Structure</h3>
          
          {(activeScheme.id === 'pkcs7' || activeScheme.id === 'none') && (
            <div className="mb-6">
              <label htmlFor="padding-input" className="block text-sm font-semibold mb-2">
                Input Text (Symmetric Block)
              </label>
              <input
                id="padding-input"
                type="text"
                value={inputString}
                onChange={(e) => setInputString(e.target.value)}
                maxLength={32}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
                placeholder="Enter short text..."
              />
            </div>
          )}

          <div aria-live="polite">
            <PaddingVisualizer scheme={activeScheme.id} inputString={inputString} />
          </div>
          
          {activeScheme.type === 'Asymmetric' && activeScheme.id !== 'none' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-200">
              <strong>Conceptual View:</strong> This diagram shows the structural format of the padded block. 
              The actual cryptographic operations (like MGF1 or SHA-256) are abstracted away to highlight 
              the high-level format that is fed into the RSA primitive.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
