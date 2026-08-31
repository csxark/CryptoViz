'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  Key,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Database,
  Laptop,
  Network,
  ArrowRight,
  Lock,
  RefreshCw,
  Info,
  Globe,
  Terminal
} from 'lucide-react'

// Types for credential database
interface RegisteredCredential {
  id: string
  username: string
  publicKey: {
    x: string
    y: string
  }
  signCount: number
  algorithm: string
  createdAt: string
  transports?: string[]
}

// Helpers for buffer conversion
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    + '=='.slice(0, (4 - (base64url.length % 4)) % 4)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

// Helper to generate deterministic simulated keys based on username
function generateSimulatedECKeyPair(username: string) {
  // Generates dummy hex coordinates based on SHA-256-like hashing for presentation
  let hashVal = 0
  for (let i = 0; i < username.length; i++) {
    hashVal = (hashVal << 5) - hashVal + username.charCodeAt(i)
    hashVal |= 0
  }
  
  const seedHex = Math.abs(hashVal).toString(16).padStart(8, '0')
  const x = 'x_coord_' + seedHex + 'f8923bc42c7e09ab2c04d1ef23d4567890abcdef1234567890abcdef'
  const y = 'y_coord_' + seedHex + '78e12ab34cd56ef789012345678901234567890abcdef1234567890abc'
  const d = 'priv_key_' + seedHex + 'cd23456789abcdef1234567890abcdef1234567890abcdef12345678'
  return { x: x.substring(0, 64), y: y.substring(0, 64), d: d.substring(0, 64) }
}

export default function WebAuthnDemo() {
  // Device & API checking
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false)
  const [mode, setMode] = useState<'simulator' | 'device'>('simulator')
  
  // Interactive Flows state
  const [activeTab, setActiveTab] = useState<'register' | 'authenticate'>('register')
  const [username, setUsername] = useState('student@cryptoviz.org')
  const [selectedCredId, setSelectedCredId] = useState<string>('')
  const [simulatedOrigin, setSimulatedOrigin] = useState('https://cryptoviz.org')
  
  // Simulated database
  const [credentials, setCredentials] = useState<RegisteredCredential[]>([
    {
      id: 'cred_p256_mock_alice8a39b',
      username: 'alice@cryptoviz.org',
      publicKey: {
        x: '8c4b1239fa8d2eb45a6c78bd9ef12c0a34b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
        y: '7d6e5c4b3a2a1f0e9d8c7b6a5a4b3c2d1e0f9e8d7c6b5a4a3b2c1d0e9f8e7d6c'
      },
      signCount: 14,
      algorithm: 'ES256 (ECDSA P-256)',
      createdAt: new Date(Date.now() - 3600000 * 24 * 5).toLocaleDateString(),
      transports: ['internal']
    },
    {
      id: 'cred_p256_mock_bobdf234a',
      username: 'bob@cryptoviz.org',
      publicKey: {
        x: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        y: '0f9e8d7c6b5a4a3b2c1d0e9f8e7d6c5b4a3b2c1d0e9f8e7d6c5b4a3b2c1d0e9f'
      },
      signCount: 3,
      algorithm: 'ES256 (ECDSA P-256)',
      createdAt: new Date(Date.now() - 3600000 * 8).toLocaleDateString(),
      transports: ['usb']
    }
  ])

  // Step-by-step visual debugger state
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [logs, setLogs] = useState<Array<{ type: 'info' | 'success' | 'error' | 'warning'; text: string }>>([
    { type: 'info', text: 'Playground initialized. Select a workflow to begin.' }
  ])
  
  // Simulated values generated during operation
  const [sessionChallenge, setSessionChallenge] = useState<string>('0xbf3c98d7210e47da8b23c91e0a24f5a6')
  const [generatedKeyPair, setGeneratedKeyPair] = useState<{ x: string; y: string; d: string } | null>(null)
  const [generatedSignature, setGeneratedSignature] = useState<string>('')
  const [clientDataJsonMock, setClientDataJsonMock] = useState<string>('')
  const [authenticatorDataMock, setAuthenticatorDataMock] = useState<string>('')
  
  // Real device state
  const [realVerificationStatus, setRealVerificationStatus] = useState<string>('')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsWebAuthnSupported(!!window.PublicKeyCredential)
    }
  }, [])

  // Auto select credential for authentication tab
  useEffect(() => {
    if (credentials.length > 0 && !selectedCredId) {
      setSelectedCredId(credentials[0].id)
    }
  }, [credentials, selectedCredId])

  const addLog = (type: 'info' | 'success' | 'error' | 'warning', text: string) => {
    setLogs(prev => [...prev, { type, text }])
  }

  // Pre-load default mock credentials when changing tab
  const handleTabChange = (tab: 'register' | 'authenticate') => {
    setActiveTab(tab)
    setCurrentStep(0)
    setGeneratedKeyPair(null)
    setGeneratedSignature('')
    setClientDataJsonMock('')
    setAuthenticatorDataMock('')
    
    if (tab === 'register') {
      setLogs([{ type: 'info', text: 'Workflow switched to Registration. Input a username and configure host settings.' }])
    } else {
      setLogs([{ type: 'info', text: 'Workflow switched to Authentication. Select a registered passkey to initiate verification.' }])
    }
  }

  // SIMULATOR: Run step-by-step registration
  const runSimulatorRegister = () => {
    if (!username) {
      addLog('error', 'Username cannot be empty.')
      return
    }

    const steps = [
      // Step 1: Server Challenge
      () => {
        const challenge = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        setSessionChallenge(challenge)
        addLog('info', `[1/4] Relying Party Server: Generated challenge: ${challenge.substring(0, 16)}...`)
        addLog('info', `Sending challenge and user: "${username}" to the browser client.`)
        setCurrentStep(1)
      },
      // Step 2: Browser Verification request to authenticator
      () => {
        addLog('info', `[2/4] Browser Client: Received create options. Matching RP ID to hostname...`)
        if (simulatedOrigin !== 'https://cryptoviz.org') {
          addLog('info', `Simulating Phishing Lab: Target Host is ${simulatedOrigin} (Relying Party expects https://cryptoviz.org).`)
        }
        addLog('info', `Sending credential request to the selected Authenticator (Simulated Passkey Manager).`)
        setCurrentStep(2)
      },
      // Step 3: Authenticator verification and key generation
      () => {
        addLog('info', `[3/4] Authenticator: Requesting User Verification (biometric prompt/PIN verification simulated).`)
        addLog('success', `✔ User Verified (Simulated FaceID/TouchID Success)`)
        
        // Generate simulated ECC Keypair
        const keys = generateSimulatedECKeyPair(username)
        setGeneratedKeyPair(keys)
        
        // Create simulated clientDataJSON
        const clientDataObj = {
          type: 'webauthn.create',
          challenge: sessionChallenge,
          origin: simulatedOrigin,
          crossOrigin: false
        }
        const clientDataStr = JSON.stringify(clientDataObj)
        setClientDataJsonMock(clientDataStr)

        // Create simulated authenticatorData
        const rpIdHash = '0x8f3c...rpIdHash'
        const flags = '0x41 (User Present (UP) + User Verification (UV) + Attestation Data (AT))'
        const signCount = '0'
        setAuthenticatorDataMock(`rpIdHash: ${rpIdHash}\nflags: ${flags}\nsignCount: ${signCount}`)

        addLog('info', `Authenticator generated asymmetric ECC key pair:`)
        addLog('info', `  Public Key X: ${keys.x.substring(0, 16)}...`)
        addLog('info', `  Private Key d: ${keys.d.substring(0, 16)}... (remains locked on device)`)
        setCurrentStep(3)
      },
      // Step 4: Server verification and storage
      () => {
        addLog('info', `[4/4] Relying Party Server: Received registration response payload.`)
        addLog('info', `Decoding CBOR Attestation Object & clientDataJSON...`)
        
        // Origin validation
        const expectedOrigin = 'https://cryptoviz.org'
        if (simulatedOrigin !== expectedOrigin) {
          addLog('error', `❌ Verification Failed: Origin Mismatch! Got: ${simulatedOrigin}, Expected: ${expectedOrigin}.`)
          addLog('error', `WebAuthn Phishing Protection blocked registration. The key is bound to ${simulatedOrigin}.`)
          setCurrentStep(4)
          return
        }

        const credId = 'cred_p256_sim_' + Math.floor(Math.random() * 1000000).toString(16)
        const keys = generatedKeyPair || generateSimulatedECKeyPair(username)
        
        const newCredential: RegisteredCredential = {
          id: credId,
          username: username,
          publicKey: { x: keys.x, y: keys.y },
          signCount: 0,
          algorithm: 'ES256 (ECDSA P-256)',
          createdAt: new Date().toLocaleDateString(),
          transports: ['internal']
        }

        setCredentials(prev => [...prev, newCredential])
        setSelectedCredId(credId)
        addLog('success', `✔ Verification Successful: Origin matched! Challenge verified!`)
        addLog('success', `✔ Registered passkey for "${username}"! Public key stored in Server Database.`)
        setCurrentStep(4)
      }
    ]

    steps[currentStep]()
  }

  // SIMULATOR: Run step-by-step authentication
  const runSimulatorAuthenticate = () => {
    const activeCred = credentials.find(c => c.id === selectedCredId)
    if (!activeCred) {
      addLog('error', 'Select a registered credential to authenticate.')
      return
    }

    const steps = [
      // Step 1: Server Challenge
      () => {
        const challenge = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        setSessionChallenge(challenge)
        addLog('info', `[1/4] Relying Party Server: Issued login challenge: ${challenge.substring(0, 16)}...`)
        addLog('info', `Allowed Credential ID: ${activeCred.id}`)
        setCurrentStep(1)
      },
      // Step 2: Browser Verification
      () => {
        addLog('info', `[2/4] Browser Client: Navigating to local Authenticator for credential matching.`)
        if (simulatedOrigin !== 'https://cryptoviz.org') {
          addLog('info', `Simulating Phishing Lab: Target Host is ${simulatedOrigin}.`)
        }
        addLog('info', `Requesting assertion signature.`)
        setCurrentStep(2)
      },
      // Step 3: Authenticator verification & signing
      () => {
        addLog('info', `[3/4] Authenticator: Looking up credential key bound to ID ${activeCred.id.substring(0, 15)}...`)
        addLog('info', `Requesting User Verification (biometrics).`)
        addLog('success', `✔ User Verified (Simulated FaceID/TouchID Success)`)

        // Format simulated clientDataJSON
        const clientDataObj = {
          type: 'webauthn.get',
          challenge: sessionChallenge,
          origin: simulatedOrigin,
          crossOrigin: false
        }
        const clientDataStr = JSON.stringify(clientDataObj)
        setClientDataJsonMock(clientDataStr)

        // Mock ECDSA SHA-256 signature
        const signatureHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        setGeneratedSignature(signatureHash)

        // Increment local signCount
        const rpIdHash = '0x8f3c...rpIdHash'
        const flags = '0x01 (User Present (UP) + User Verification (UV))'
        const nextCount = activeCred.signCount + 1
        setAuthenticatorDataMock(`rpIdHash: ${rpIdHash}\nflags: ${flags}\nsignCount: ${nextCount}`)

        addLog('info', `Authenticator created assertion signature using bound private key.`)
        addLog('info', `Signature (ECDSA): ${signatureHash.substring(0, 20)}...`)
        setCurrentStep(3)
      },
      // Step 4: Server verify signature and logs in
      () => {
        addLog('info', `[4/4] Relying Party Server: Verifying assertion data.`)
        
        // Origin validation
        const expectedOrigin = 'https://cryptoviz.org'
        if (simulatedOrigin !== expectedOrigin) {
          addLog('error', `❌ Verification Failed: Origin Mismatch! Got: ${simulatedOrigin}, Expected: ${expectedOrigin}.`)
          addLog('error', `Phishing Protection successfully blocked login. Attacker cannot steal the assertion signature.`)
          setCurrentStep(4)
          return
        }

        // Verify challenge
        addLog('info', `Verifying challenge matching server session...`)
        
        // Update credentials array sign count
        setCredentials(prev => prev.map(c => {
          if (c.id === activeCred.id) {
            return { ...c, signCount: c.signCount + 1 }
          }
          return c
        }))

        addLog('success', `✔ Verification Successful: Signature matches clientDataHash and Public Key coordinates!`)
        addLog('success', `✔ Access Granted: Welcome back, ${activeCred.username}!`)
        setCurrentStep(4)
      }
    ]

    steps[currentStep]()
  }

  // REAL DEVICE: Register Passkey via W3C WebAuthn API
  const handleRealRegister = async () => {
    if (!isWebAuthnSupported) {
      addLog('error', 'WebAuthn is not supported in this browser environment.')
      return
    }

    try {
      setRealVerificationStatus('Initializing device prompt...')
      addLog('info', 'Real Device: Generating registration request options.')

      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const userId = crypto.getRandomValues(new Uint8Array(16))

      const creationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: 'CryptoViz WebAuthn Demo',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: username,
          displayName: username.split('@')[0]
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256 (P-256 Elliptic Curve)
          { alg: -257, type: 'public-key' } // RS256 (RSA 2048)
        ],
        authenticatorSelection: {
          residentKey: 'preferred',
          requireResidentKey: false,
          userVerification: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }

      addLog('info', 'Invoking navigator.credentials.create(). Prompting physical device...')
      const credential = (await navigator.credentials.create({
        publicKey: creationOptions
      })) as PublicKeyCredential

      if (!credential) {
        throw new Error('Credential creation failed or was cancelled.')
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse

      // Convert credentials to readable text
      const rawId = bufferToBase64url(credential.rawId)
      
      // Decode clientDataJSON
      const clientDataDecoded = new TextDecoder().decode(credential.response.clientDataJSON)
      const clientDataObj = JSON.parse(clientDataDecoded)
      
      setClientDataJsonMock(clientDataDecoded)
      setAuthenticatorDataMock(`rawId: ${rawId}\ntype: ${credential.type}\ntransports: ${attestationResponse.getTransports ? attestationResponse.getTransports().join(',') : 'n/a'}`)

      // Create a mock storage public key since parsing actual COSE public key requires complete CBOR parser library
      // But we will show a mock valid EC representation
      const keys = generateSimulatedECKeyPair(username)

      const newCredential: RegisteredCredential = {
        id: rawId,
        username: username,
        publicKey: { x: keys.x, y: keys.y },
        signCount: 0,
        algorithm: 'ES256 (ECDSA P-256)',
        createdAt: new Date().toLocaleDateString(),
        transports: attestationResponse.getTransports ? attestationResponse.getTransports() : ['internal']
      }

      setCredentials(prev => [...prev, newCredential])
      setSelectedCredId(rawId)

      setRealVerificationStatus('Credential registered successfully!')
      addLog('success', `✔ Real Device Registration Successful! Passkey saved on device. ID: ${rawId.substring(0, 12)}...`)
    } catch (err: unknown) {
      setRealVerificationStatus('Error occurred during registration.')
      const msg = err instanceof Error ? err.message : String(err)
      addLog('error', `Real Device Error: ${msg}`)
      console.error(err)
    }
  }

  // REAL DEVICE: Authenticate Passkey via W3C WebAuthn API
  const handleRealAuthenticate = async () => {
    if (!isWebAuthnSupported) {
      addLog('error', 'WebAuthn is not supported in this browser environment.')
      return
    }

    const activeCred = credentials.find(c => c.id === selectedCredId)
    if (!activeCred) {
      addLog('error', 'Please register or select a passkey to authenticate.')
      return
    }

    try {
      setRealVerificationStatus('Initializing device prompt...')
      addLog('info', 'Real Device: Generating authentication assertion options.')

      const challenge = crypto.getRandomValues(new Uint8Array(32))

      const requestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64urlToBuffer(activeCred.id),
            type: 'public-key'
          }
        ],
        userVerification: 'preferred',
        timeout: 60000
      }

      addLog('info', `Invoking navigator.credentials.get(). Prompting physical device for ID: ${activeCred.id.substring(0, 10)}...`)
      const assertion = (await navigator.credentials.get({
        publicKey: requestOptions
      })) as PublicKeyCredential

      if (!assertion) {
        throw new Error('Assertion failed or was cancelled.')
      }

      // Decode clientDataJSON
      const clientDataDecoded = new TextDecoder().decode(assertion.response.clientDataJSON)
      setClientDataJsonMock(clientDataDecoded)

      // Signature values
      const assertionResponse = assertion.response as AuthenticatorAssertionResponse
      const signatureHex = bufferToBase64url(assertionResponse.signature)
      setGeneratedSignature(signatureHex)

      const authDataHex = bufferToBase64url(assertionResponse.authenticatorData)
      setAuthenticatorDataMock(`authenticatorData (base64url): ${authDataHex.substring(0, 30)}...\nsignature (base64url): ${signatureHex.substring(0, 30)}...`)

      // Increment sign count
      setCredentials(prev => prev.map(c => {
        if (c.id === activeCred.id) {
          return { ...c, signCount: c.signCount + 1 }
        }
        return c
      }))

      setRealVerificationStatus('Authentication successful!')
      addLog('success', `✔ Real Device Authentication Successful! Welcome, ${activeCred.username}!`)
    } catch (err: unknown) {
      setRealVerificationStatus('Error occurred during authentication.')
      const msg = err instanceof Error ? err.message : String(err)
      addLog('error', `Real Device Error: ${msg}`)
      console.error(err)
    }
  }

  // Active step details helper
  const stepDetails = useMemo(() => {
    const stepsList = activeTab === 'register' 
      ? [
          { title: 'Server Challenge', desc: 'Relying Party (Server) generates a cryptographically secure random challenge to prevent replay attacks.' },
          { title: 'Origin Bind check', desc: 'Browser matches the relying party ID with the site domain to enforce origin binding.' },
          { title: 'User Biometrics', desc: 'Authenticator requires user verification (FaceID, fingerprint, PIN) before interacting with keys.' },
          { title: 'Save Public Key', desc: 'Authenticator generates a P-256 EC key pair. Private key is saved in secure hardware, and public key is uploaded to server.' }
        ]
      : [
          { title: 'Login Challenge', desc: 'Server sends a new random challenge along with the registered credential ID to log in.' },
          { title: 'Device Lookup', desc: 'Browser localizes the matching credential and requests signature permissions.' },
          { title: 'Assertion Signature', desc: 'Authenticator uses the private key stored inside device hardware to sign the challenge.' },
          { title: 'Access Granted', desc: 'Server verifies signature matching the stored coordinate public key, then grants entry.' }
        ]
    return stepsList
  }, [activeTab])

  return (
    <div className="w-full space-y-8">
      {/* Title & Setup Header */}
      <section className="bg-white dark:bg-[#16161A] border border-zinc-200 dark:border-[#2A2A31] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,194,174,0.12),transparent_45%)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#00C2AE] bg-[#00C2AE]/10 border border-[#00C2AE]/20 rounded-full">
              FIDO2 Standard
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-[#F5F5F5]">
              WebAuthn & Passkeys Playground
            </h2>
            <p className="max-w-2xl text-zinc-600 dark:text-[#B3B3B8] text-sm sm:text-base">
              Learn how passkeys replace passwords by creating public-key credentials bound to websites, protecting users from phishing attacks.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="bg-zinc-100 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl p-1.5 flex gap-2 shrink-0 self-start md:self-auto">
            <button
              onClick={() => { setMode('simulator'); addLog('info', 'Switched to Educational Simulator Mode.') }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5
                ${mode === 'simulator'
                  ? 'bg-[#00C2AE] text-[#09090B] shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
            >
              <Laptop size={14} />
              Educational Simulator
            </button>
            <button
              onClick={() => { setMode('device'); addLog('info', 'Switched to Real Device API Mode.') }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 relative
                ${mode === 'device'
                  ? 'bg-[#00C2AE] text-[#09090B] shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
            >
              <Fingerprint size={14} />
              Real Device
              {!isWebAuthnSupported && (
                <span className="absolute -top-1.5 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Main Sandbox Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Controls (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Controls Card */}
          <div className="bg-white dark:bg-[#16161A] border border-zinc-200 dark:border-[#2A2A31] rounded-2xl overflow-hidden shadow-sm">
            <div className="border-b border-zinc-200 dark:border-[#2A2A31] bg-zinc-50 dark:bg-[#1A1A1F] px-5 py-4 flex gap-4">
              <button
                onClick={() => handleTabChange('register')}
                className={`pb-1 text-sm font-bold border-b-2 transition-colors
                  ${activeTab === 'register'
                    ? 'border-[#00C2AE] text-[#00C2AE]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
              >
                1. Passkey Registration
              </button>
              <button
                onClick={() => handleTabChange('authenticate')}
                className={`pb-1 text-sm font-bold border-b-2 transition-colors
                  ${activeTab === 'authenticate'
                    ? 'border-[#00C2AE] text-[#00C2AE]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
              >
                2. Authentication (Login)
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Form Input fields */}
              {activeTab === 'register' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Username / Email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="student@cryptoviz.org"
                    className="w-full bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00C2AE] transition-all"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Select Credentials
                  </label>
                  {credentials.length > 0 ? (
                    <select
                      value={selectedCredId}
                      onChange={(e) => setSelectedCredId(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00C2AE] text-zinc-800 dark:text-zinc-200"
                    >
                      {credentials.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.username} ({c.id.substring(0, 12)}...)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                      No credentials registered yet. Use the Registration tab to create one.
                    </p>
                  )}
                </div>
              )}

              {/* Hostname simulation (only active in Simulator Mode) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Globe size={12} className="text-[#00C2AE]" />
                    Simulated Target Hostname
                  </label>
                  {mode === 'device' && (
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">
                      Locked to localhost
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={mode === 'device'}
                    onClick={() => { setSimulatedOrigin('https://cryptoviz.org'); addLog('info', 'Hostname set to legitimate site: cryptoviz.org') }}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5
                      ${simulatedOrigin === 'https://cryptoviz.org'
                        ? 'border-[#00C2AE]/50 bg-[#00C2AE]/10 text-[#00C2AE]'
                        : 'border-zinc-200 dark:border-[#2A2A31] bg-zinc-50 dark:bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
                      } ${mode === 'device' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                    cryptoviz.org (Real)
                  </button>
                  <button
                    disabled={mode === 'device'}
                    onClick={() => { setSimulatedOrigin('https://phishy-cryptoviz.com'); addLog('warning', 'Hostname set to phishing site: phishy-cryptoviz.com') }}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5
                      ${simulatedOrigin === 'https://phishy-cryptoviz.com'
                        ? 'border-rose-500/50 bg-rose-500/10 text-rose-500'
                        : 'border-zinc-200 dark:border-[#2A2A31] bg-zinc-50 dark:bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
                      } ${mode === 'device' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                    phishy-cryptoviz.com (Fake)
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  WebAuthn binds credential keys to domain names. If registration or login happens on a phishing hostname, verification fails.
                </p>
              </div>

              {/* Execution Actions */}
              <div className="pt-4 border-t border-zinc-200 dark:border-[#2A2A31] space-y-3">
                {mode === 'simulator' ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={activeTab === 'register' ? runSimulatorRegister : runSimulatorAuthenticate}
                      className="w-full bg-[#00C2AE] hover:bg-[#14D8C2] text-[#09090B] py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      {currentStep === 4 ? <RefreshCw size={16} className="animate-spin" /> : null}
                      {currentStep === 4 
                        ? 'Restart Workflow' 
                        : currentStep === 0 
                          ? (activeTab === 'register' ? 'Start Register Workflow' : 'Start Login Workflow')
                          : `Next Step (${currentStep + 1}/4)`
                      }
                      <ArrowRight size={16} />
                    </button>
                    {currentStep > 0 && currentStep < 4 && (
                      <button
                        onClick={() => { setCurrentStep(0); addLog('info', 'Workflow reset.') }}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 py-1 transition-all"
                      >
                        Reset Step progress
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {!isWebAuthnSupported ? (
                      <div className="flex gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <strong>Browser Not Supported:</strong> Your current browser or sandbox context does not expose window.PublicKeyCredential. Please run in Simulator mode.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          onClick={activeTab === 'register' ? handleRealRegister : handleRealAuthenticate}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                        >
                          <Fingerprint size={16} />
                          {activeTab === 'register' ? 'Trigger Device Registration' : 'Trigger Device Login'}
                        </button>
                        {realVerificationStatus && (
                          <div className="p-3 bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                            Status: {realVerificationStatus}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Database Viewer Card */}
          <div className="bg-white dark:bg-[#16161A] border border-zinc-200 dark:border-[#2A2A31] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-[#2A2A31] bg-zinc-50 dark:bg-[#1A1A1F] flex items-center gap-2">
              <Database size={16} className="text-[#00C2AE]" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Relying Party Database (Server Storage)
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-[#2A2A31] text-zinc-400 uppercase tracking-wider font-bold">
                    <th className="py-2 pr-2">User</th>
                    <th className="py-2 px-2">Credential ID</th>
                    <th className="py-2 px-2">Public Key (EC)</th>
                    <th className="py-2 pl-2 text-right">Counter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-[#2A2A31] font-mono text-zinc-600 dark:text-zinc-300">
                  {credentials.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-3 pr-2 truncate max-w-[80px] font-sans font-semibold text-zinc-800 dark:text-zinc-200">
                        {c.username.split('@')[0]}
                      </td>
                      <td className="py-3 px-2 text-teal-600 dark:text-[#00C2AE]">
                        {c.id.substring(0, 10)}...
                      </td>
                      <td className="py-3 px-2 text-zinc-400">
                        X: {c.publicKey.x.substring(0, 6)}... Y: {c.publicKey.y.substring(0, 6)}...
                      </td>
                      <td className="py-3 pl-2 text-right font-bold text-zinc-800 dark:text-zinc-200">
                        {c.signCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side Visualizer & Decoders (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Animated Protocol Flow Chart */}
          <div className="bg-[#101013] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <div className="absolute top-0 right-0 p-3 flex gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
            </div>

            <h3 className="text-sm font-bold text-[#F5F5F5] mb-6 flex items-center gap-1.5">
              <Terminal size={14} className="text-[#00C2AE]" />
              Flow Steps Animation
            </h3>

            {/* Steps graphics */}
            <div className="grid grid-cols-3 gap-2 relative items-center mb-8">
              
              {/* Connector lines */}
              <div className="absolute left-[16.6%] right-[16.6%] h-0.5 bg-zinc-800 top-[35px] -z-10">
                <div className={`h-full bg-teal-500 transition-all duration-500`} style={{
                  width: currentStep === 1 ? '50%' : currentStep >= 2 ? '100%' : '0%'
                }} />
              </div>
              
              {/* Actor 1: Server */}
              <div className="flex flex-col items-center gap-2">
                <div className={`h-16 w-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
                  ${currentStep === 1 || (currentStep === 4 && activeTab === 'authenticate')
                    ? 'border-[#00C2AE] bg-[#00C2AE]/10 shadow-[0_0_15px_rgba(0,194,174,0.3)]'
                    : 'border-zinc-800 bg-[#16161A]'
                  }`}>
                  <Network size={24} className={currentStep === 1 ? 'text-[#00C2AE]' : 'text-zinc-500'} />
                </div>
                <span className="text-xs font-bold text-zinc-300">Relying Party</span>
                <span className="text-[10px] text-zinc-500">Server</span>
              </div>

              {/* Actor 2: Browser (Client) */}
              <div className="flex flex-col items-center gap-2">
                <div className={`h-16 w-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
                  ${currentStep === 2
                    ? 'border-[#00C2AE] bg-[#00C2AE]/10 shadow-[0_0_15px_rgba(0,194,174,0.3)]'
                    : 'border-zinc-800 bg-[#16161A]'
                  }`}>
                  <Laptop size={24} className={currentStep === 2 ? 'text-[#00C2AE]' : 'text-zinc-500'} />
                </div>
                <span className="text-xs font-bold text-zinc-300">Browser</span>
                <span className="text-[10px] text-zinc-500">{simulatedOrigin.replace('https://', '')}</span>
              </div>

              {/* Actor 3: Authenticator */}
              <div className="flex flex-col items-center gap-2">
                <div className={`h-16 w-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
                  ${currentStep === 3
                    ? 'border-[#00C2AE] bg-[#00C2AE]/10 shadow-[0_0_15px_rgba(0,194,174,0.3)]'
                    : 'border-zinc-800 bg-[#16161A]'
                  }`}>
                  <Fingerprint size={24} className={currentStep === 3 ? 'text-[#00C2AE]' : 'text-zinc-500'} />
                </div>
                <span className="text-xs font-bold text-zinc-300">Authenticator</span>
                <span className="text-[10px] text-zinc-500">Passkey Module</span>
              </div>

            </div>

            {/* Current Step Description Card */}
            {currentStep > 0 && currentStep <= 4 ? (
              <div className="bg-[#16161A] border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">
                    Step {currentStep} of 4
                  </span>
                  <span className="text-xs font-bold text-[#F5F5F5]">
                    {stepDetails[currentStep - 1]?.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {stepDetails[currentStep - 1]?.desc}
                </p>
              </div>
            ) : (
              <div className="bg-[#16161A] border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-xs text-zinc-500">
                  Select controls on the left and trigger flow to watch protocol stages.
                </p>
              </div>
            )}
          </div>

          {/* Cryptographic Inspector Panel */}
          <div className="bg-white dark:bg-[#16161A] border border-zinc-200 dark:border-[#2A2A31] rounded-2xl p-6 space-y-6">
            <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5] border-b border-zinc-200 dark:border-[#2A2A31] pb-3 flex items-center gap-1.5">
              <Shield size={16} className="text-[#00C2AE]" />
              Cryptographic Payload Inspector
            </h3>

            {/* ClientDataJSON Inspector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Info size={12} className="text-teal-500" />
                  clientDataJSON (UTF-8 Plaintext representation)
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Decoded UTF-8</span>
              </div>
              <div className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl p-4 font-mono text-xs text-zinc-600 dark:text-teal-400 overflow-x-auto min-h-[50px] flex items-center">
                {clientDataJsonMock ? (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(clientDataJsonMock), null, 2)}</pre>
                ) : (
                  <span className="text-zinc-400">Trigger registration/login to capture clientDataJSON...</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Contains the challenge, origin domain, and request type. The server uses this to verify that the request came from the legitimate host, preventing phishing.
              </p>
            </div>

            {/* AuthenticatorData / Attestation Object Inspector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Key size={12} className="text-teal-500" />
                  authenticatorData (Parsed Metadata)
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Binary CBOR</span>
              </div>
              <div className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl p-4 font-mono text-xs text-zinc-600 dark:text-zinc-300 overflow-x-auto min-h-[60px] flex items-center">
                {authenticatorDataMock ? (
                  <pre className="whitespace-pre-wrap">{authenticatorDataMock}</pre>
                ) : (
                  <span className="text-zinc-400">Payload data will be shown here upon authenticator output.</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Raw authenticator bytes packed in CBOR container. Contains flags representing user presence (UP) and user verification (UV), along with a global signature counter.
              </p>
            </div>

            {/* COSE Public Key Decoder (Only shown on Registration Tab) */}
            {activeTab === 'register' && (
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-[#2A2A31]">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Lock size={12} className="text-[#00C2AE]" />
                  COSE Format Public Key mapping (Elliptic Curve Key representation)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl p-4 space-y-2">
                    <span className="text-[10px] font-bold text-teal-500 uppercase tracking-widest font-mono">Raw COSE CBOR Map</span>
                    <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-300 leading-relaxed">
{`{
  1: 2,      // kty: Elliptic Curve (EC2)
  3: -7,     // alg: ECDSA with SHA-256 (ES256)
  -1: 1,     // crv: P-256 Elliptic Curve
  -2: "${generatedKeyPair ? generatedKeyPair.x.substring(0, 10) + '...' : 'coord_x_bytes'}",
  -3: "${generatedKeyPair ? generatedKeyPair.y.substring(0, 10) + '...' : 'coord_y_bytes'}"
}`}
                    </pre>
                  </div>
                  <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <p>
                      Instead of standard JSON web keys, WebAuthn authenticators encode keys using <strong>CBOR maps</strong> with compressed integer keys to reduce packet overhead:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li><strong className="text-zinc-800 dark:text-zinc-300">1: 2</strong> means Key Type is Elliptic Curve.</li>
                      <li><strong className="text-zinc-800 dark:text-zinc-300">3: -7</strong> means the cryptographic signing algorithm is ES256.</li>
                      <li><strong className="text-zinc-800 dark:text-zinc-300">-2 & -3</strong> coordinates represent the public key on the Curve grid.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Decoder (Only shown on Authentication Tab) */}
            {activeTab === 'authenticate' && (
              <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-[#2A2A31]">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Info size={12} className="text-[#00C2AE]" />
                  ECDSA Signature Output
                </span>
                <div className="bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-[#2A2A31] rounded-xl p-4 font-mono text-xs text-zinc-600 dark:text-rose-400 overflow-x-auto min-h-[50px] flex items-center">
                  {generatedSignature ? (
                    <span className="text-emerald-500 break-all">{generatedSignature}</span>
                  ) : (
                    <span className="text-zinc-400">Run authentication to capture ECDSA P-256 signature payload...</span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Cryptographic signature generated by the hardware device. The server validates this using the registered coordinates $(X,Y)$ over $H(authenticatorData \,\|\, H(clientDataJSON))$.
                </p>
              </div>
            )}

          </div>

          {/* Console / Output log */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-2xl overflow-hidden shadow-md">
            <div className="px-5 py-3.5 border-b border-zinc-800 bg-[#16161A] flex items-center gap-2">
              <Terminal size={14} className="text-teal-400" />
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono">
                Log Terminal output
              </h3>
            </div>
            <div className="p-4 h-48 overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {logs.map((log, idx) => (
                <div key={idx} className={`leading-relaxed
                  ${log.type === 'success' 
                    ? 'text-emerald-400' 
                    : log.type === 'error' 
                      ? 'text-rose-400 font-bold' 
                      : 'text-zinc-300'
                  }`}
                >
                  <span className="text-zinc-600 select-none mr-2">&gt;</span>
                  {log.text}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
