'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Award,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Calendar,
  User,
  BookOpen,
  Search,
  ExternalLink,
  Info,
} from 'lucide-react'
import { getLearningPathById } from '@/lib/learning-paths/data'
import { verifyCertificateHash, getCertificateId } from '@/lib/utils/certificate'

function VerifyContent() {
  const searchParams = useSearchParams()

  // Get initial values from URL
  const urlName = searchParams.get('name') || ''
  const urlPathId = searchParams.get('pathId') || ''
  const urlDate = searchParams.get('date') || ''
  const urlHash = searchParams.get('hash') || ''

  // Form states
  const [name, setName] = useState(urlName)
  const [pathId, setPathId] = useState(urlPathId)
  const [date, setDate] = useState(urlDate)
  const [hash, setHash] = useState(urlHash)

  // Sync state if URL changes
  useEffect(() => {
    setName(urlName)
    setPathId(urlPathId)
    setDate(urlDate)
    setHash(urlHash)
  }, [urlName, urlPathId, urlDate, urlHash])

  // Verification process
  const hasParams = urlName && urlPathId && urlDate && urlHash
  const isValid = hasParams ? verifyCertificateHash(urlName, urlPathId, urlDate, urlHash) : false
  const path = getLearningPathById(urlPathId)
  const certSerial = isValid ? getCertificateId(urlPathId, urlHash) : ''

  // Manual submission form
  const [pastedUrl, setPastedUrl] = useState('')
  const [submitError, setSubmitError] = useState('')

  const handleParseUrl = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    try {
      const url = new URL(pastedUrl.trim())
      const params = new URLSearchParams(url.search)

      const nameParam = params.get('name')
      const pathParam = params.get('pathId')
      const dateParam = params.get('date')
      const hashParam = params.get('hash')

      if (nameParam && pathParam && dateParam && hashParam) {
        // Redirect or load parameters
        window.location.search = params.toString()
      } else {
        setSubmitError('The pasted link is missing certificate details. Please check the URL.')
      }
    } catch {
      setSubmitError('Invalid URL format. Please paste a valid verification link.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link
            href="/learning-paths"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learning Paths Home</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 flex items-center justify-center gap-2.5">
            <ShieldCheck className="w-9 h-9 text-cyan-400" />
            <span>Certificate Verification</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Verify the authenticity of CryptoViz Interactive Learning Path certificates using client-side SHA-256 integrity verification.
          </p>
        </div>

        {/* 1. Results View (if URL has params) */}
        {hasParams ? (
          <div className="space-y-6">
            {isValid ? (
              /* Success Certificate Box */
              <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-emerald-950/10">
                <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-bl-2xl border-l border-b border-emerald-500/20">
                  Authentic Credential
                </div>

                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-emerald-400">Verification Successful</h2>
                      <p className="text-xs text-slate-400">
                        This digital certificate has been mathematically authenticated.
                      </p>
                    </div>
                  </div>

                  {/* Cert details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <User className="w-3.5 h-3.5" />
                        <span>Recipient</span>
                      </div>
                      <p className="text-lg font-bold text-slate-100">{urlName}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <Award className="w-3.5 h-3.5" />
                        <span>Learning Path</span>
                      </div>
                      <p className="text-lg font-bold text-slate-100">{path?.title || urlPathId}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Date Completed</span>
                      </div>
                      <p className="text-base font-bold text-slate-200">{urlDate}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <Info className="w-3.5 h-3.5" />
                        <span>Credential Serial</span>
                      </div>
                      <p className="text-base font-mono font-bold text-slate-200">{certSerial}</p>
                    </div>
                  </div>

                  {/* Technical Explainer */}
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
                    <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>How validation works</span>
                    </h4>
                    <p className="leading-relaxed">
                      This certificate carries a cryptographic checksum generated using the SHA-256 algorithm. The system hashes the recipient name, path identifier, and completion date along with a secret salt. Because the generated signature matches the URL digest (<code className="text-slate-300">{urlHash.slice(0, 12)}...</code>), the credential is guaranteed authentic and free from modifications.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800/60">
                    {path && (
                      <Link
                        href={`/learning-paths/${path.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                      >
                        <span>View Curriculum Path</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button
                      onClick={() => (window.location.search = '')}
                      className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 font-semibold transition-colors"
                    >
                      Verify Another Certificate
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Failure Warning Card */
              <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-red-950/10">
                <div className="absolute top-0 right-0 bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-bl-2xl border-l border-b border-red-500/20">
                  Verification Failed
                </div>

                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/15 text-red-400 rounded-2xl">
                      <XCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-red-400">Invalid Cryptographic Signature</h2>
                      <p className="text-xs text-slate-400">
                        The verification checksum did not match the provided details.
                      </p>
                    </div>
                  </div>

                  {/* Tamper Warning */}
                  <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 text-xs text-red-200 leading-relaxed">
                    <strong>WARNING:</strong> The signature digest provided in the URL is incorrect for the parameters supplied. This indicates that one or more fields (Name, Learning Path, or Completion Date) may have been tampered with or modified from the original certificate issue data.
                  </div>

                  {/* Fields Details */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs font-mono space-y-1 text-slate-400">
                    <p>Recipient: {urlName || '<empty>'}</p>
                    <p>Path ID: {urlPathId || '<empty>'}</p>
                    <p>Date: {urlDate || '<empty>'}</p>
                    <p className="break-all">Provided Hash: {urlHash || '<empty>'}</p>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-800/60">
                    <button
                      onClick={() => (window.location.search = '')}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                    >
                      Retry Manually
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 2. Manual URL Check Input */
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">Verify a Shared Certificate</h2>
              <p className="text-xs text-slate-400">
                Paste the verification link that was generated by a certificate holder to check its credentials.
              </p>
            </div>

            <form onSubmit={handleParseUrl} className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Paste verification link here..."
                  value={pastedUrl}
                  onChange={(e) => setPastedUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
                  required
                />
              </div>

              {submitError && (
                <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{submitError}</span>
                </p>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all"
              >
                <span>Verify Credential</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading validator...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
