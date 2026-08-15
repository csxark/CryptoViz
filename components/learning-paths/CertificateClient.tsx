'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Award,
  Printer,
  Share2,
  Moon,
  Sun,
  ShieldAlert,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import { getLearningPathById } from '@/lib/learning-paths/data'
import { useLearningPath } from '@/lib/hooks/useLearningPath'
import { generateCertificateHash, getCertificateId } from '@/lib/utils/certificate'

export default function CertificateClient({ pathId }: { pathId: string }) {
  const path = getLearningPathById(pathId)
  const { getPathProgressPercentage } = useLearningPath()

  const [name, setName] = useState('Cryptographer')
  const [date, setDate] = useState('')
  const [theme, setTheme] = useState<'cyber' | 'formal'>('cyber')
  const [copied, setCopied] = useState(false)
  const certificateRef = useRef<HTMLDivElement>(null)

  // Initialize date and fetch stored name if exists
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)

    const storedName = localStorage.getItem('cryptoviz_certificate_name')
    if (storedName) {
      setName(storedName)
    }
  }, [])

  if (!path) {
    notFound()
  }

  const progressPercentage = getPathProgressPercentage(path.id)
  const isCompleted = progressPercentage === 100

  // Handle name change and persist
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    localStorage.setItem('cryptoviz_certificate_name', newName)
  }

  // Generate cryptographic details
  const certHash = generateCertificateHash(name, path.id, date)
  const certSerial = getCertificateId(path.id, certHash)

  // Copy shareable validation link
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return

    const baseUrl = window.location.origin
    const shareUrl = `${baseUrl}/learning-paths/verify?name=${encodeURIComponent(
      name
    )}&pathId=${encodeURIComponent(path.id)}&date=${encodeURIComponent(
      date
    )}&hash=${encodeURIComponent(certHash)}`

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Trigger print flow
  const handlePrint = () => {
    window.print()
  }

  // If path is not complete, show locked page
  if (!isCompleted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100">Certificate Locked</h1>
            <p className="text-sm text-slate-400">
              You must complete all lessons in the <span className="text-cyan-400 font-semibold">{path.title}</span> path before claiming your certificate.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
              <span>Current Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mb-6">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <Link
              href={`/learning-paths/${path.id}`}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all"
            >
              <span>Back to Lessons</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      {/* Print Stylesheet injection to format print perfectly */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, input, .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            width: 100% !important;
            height: 100% !important;
          }
          .cert-frame {
            border-width: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            aspect-ratio: 1.414 / 1 !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-8 no-print">
        {/* Back Link */}
        <Link
          href={`/learning-paths/${path.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {path.title} Details</span>
        </Link>

        {/* Certificate Configurations Row */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Name Customizer */}
          <div className="space-y-2">
            <label htmlFor="earner-name" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recipient Name
            </label>
            <input
              id="earner-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Enter name to print"
              maxLength={40}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
            />
          </div>

          {/* Date Selector */}
          <div className="space-y-2">
            <label htmlFor="issue-date" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Issue Date
            </label>
            <input
              id="issue-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
            />
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Certificate Theme
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('cyber')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  theme === 'cyber'
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Cyber Dark</span>
              </button>
              <button
                onClick={() => setTheme('formal')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  theme === 'formal'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Formal Light</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Certificate Box */}
      <div className="max-w-5xl mx-auto my-10 print:my-0 print-container">
        <div
          ref={certificateRef}
          className={`cert-frame relative w-full aspect-[1.414/1] rounded-3xl p-8 sm:p-12 md:p-16 border flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ${
            theme === 'cyber'
              ? 'bg-slate-950 border-cyan-500/40 shadow-cyan-900/20 text-slate-100'
              : 'bg-amber-50 border-amber-800/60 shadow-amber-900/10 text-slate-900'
          }`}
        >
          {/* Cyber Theme Glowing Mesh Grid in Background */}
          {theme === 'cyber' && (
            <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center select-none font-mono text-[9px] leading-tight overflow-hidden whitespace-pre font-semibold">
              {Array.from({ length: 45 }).map((_, i) => (
                <div key={i} className="tracking-widest">
                  {`01000011 01010010 01011001 01010000 01010100 01001111\n`}
                  {`01000011 01010010 01011001 01010000 01010100 01001111\n`}
                </div>
              ))}
            </div>
          )}

          {/* Formal Theme Border Corners */}
          {theme === 'formal' && (
            <div className="absolute inset-3 border border-amber-700/20 pointer-events-none rounded-2xl flex items-center justify-center">
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-800/40" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-800/40" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-800/40" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-800/40" />
            </div>
          )}

          {/* Top Row: Title & Serial */}
          <div className="flex justify-between items-start z-10">
            <div className="space-y-1">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                theme === 'cyber'
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                  : 'bg-amber-800/10 border border-amber-800/20 text-amber-900'
              }`}>
                CryptoViz Verified
              </div>
              <p className={`text-[10px] font-mono ${theme === 'cyber' ? 'text-slate-500' : 'text-slate-500'}`}>
                ID: {certSerial}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Award className={`w-8 h-8 ${theme === 'cyber' ? 'text-cyan-400' : 'text-amber-700'}`} />
              <span className={`font-black tracking-tighter text-lg ${
                theme === 'cyber' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent' : 'text-amber-900'
              }`}>
                CryptoViz
              </span>
            </div>
          </div>

          {/* Middle Body Content */}
          <div className="text-center space-y-6 sm:space-y-8 z-10 my-auto">
            <div className="space-y-2">
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-wide font-serif ${
                theme === 'cyber' ? 'text-slate-100' : 'text-amber-900'
              }`}>
                Certificate of Completion
              </h2>
              <p className={`text-xs sm:text-sm font-medium ${theme === 'cyber' ? 'text-slate-400' : 'text-slate-600'}`}>
                This cryptographically authenticated credential is proudly awarded to
              </p>
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <p className={`text-2xl sm:text-3xl md:text-4xl font-black font-serif italic border-b pb-2 ${
                theme === 'cyber' ? 'text-cyan-400 border-slate-800' : 'text-slate-900 border-amber-200'
              }`}>
                {name || 'Cryptographer'}
              </p>
              <p className={`text-[11px] sm:text-xs leading-relaxed ${theme === 'cyber' ? 'text-slate-400' : 'text-slate-600'}`}>
                for successfully mastering all curriculum modules, quizzes, and simulation tasks in the interactive learning path
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tight ${
                theme === 'cyber' ? 'text-slate-100' : 'text-slate-900'
              }`}>
                {path.title}
              </h3>
              <p className={`text-[10px] sm:text-xs font-bold ${
                theme === 'cyber' ? 'text-slate-500' : 'text-slate-500'
              }`}>
                Difficulty: {path.difficulty} • Category: {path.category}
              </p>
            </div>
          </div>

          {/* Bottom Row: Signatures, Seal & Hash */}
          <div className={`grid grid-cols-3 items-end gap-4 z-10 pt-4 border-t border-dashed mt-auto ${
            theme === 'cyber' ? 'border-slate-800' : 'border-amber-200'
          }`}>
            {/* Left: Authority Signature */}
            <div className="space-y-1 text-left">
              <div className={`h-8 font-serif italic text-lg flex items-end ${
                theme === 'cyber' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                CryptoViz Academy
              </div>
              <div className={`border-t pt-1 text-[9px] uppercase tracking-wider font-bold ${
                theme === 'cyber' ? 'border-slate-800 text-slate-500' : 'border-amber-200 text-slate-500'
              }`}>
                Authorized Issuer
              </div>
            </div>

            {/* Middle: Path Badge Seal */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-lg ${
                theme === 'cyber'
                  ? 'bg-slate-900 border-cyan-500/30 text-cyan-400 shadow-cyan-900/10'
                  : 'bg-amber-100 border-amber-700/30 text-amber-800 shadow-amber-900/5'
              }`}>
                <Award className="w-7 h-7" />
              </div>
              <span className={`text-[9px] font-bold uppercase mt-1.5 ${
                theme === 'cyber' ? 'text-slate-400' : 'text-slate-700'
              }`}>
                {path.badge.name}
              </span>
            </div>

            {/* Right: Validation Hash (SHA-256 Signature) */}
            <div className="space-y-1 text-right">
              <div className={`h-8 flex flex-col justify-end text-[9px] font-mono leading-tight ${
                theme === 'cyber' ? 'text-slate-500' : 'text-slate-600'
              }`}>
                <span className="font-bold text-[8px] uppercase tracking-wider block">SHA-256 Digest</span>
                <span className="break-all">{certHash.slice(0, 16)}...{certHash.slice(-16)}</span>
              </div>
              <div className={`border-t pt-1 text-[9px] uppercase tracking-wider font-bold ${
                theme === 'cyber' ? 'border-slate-800 text-slate-500' : 'border-amber-200 text-slate-500'
              }`}>
                Cryptographic Signature
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons Footer */}
      <div className="max-w-5xl mx-auto flex flex-wrap gap-4 items-center justify-between no-print p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-slate-100 font-semibold text-sm transition-all border border-slate-700 hover:border-slate-600"
          >
            <Printer className="w-4 h-4" />
            <span>Print or Save to PDF</span>
          </button>

          <button
            onClick={handleCopyLink}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all border ${
              copied
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-slate-100'
            }`}
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Verification Link'}</span>
          </button>
        </div>

        <Link
          href={`/learning-paths/verify?name=${encodeURIComponent(name)}&pathId=${encodeURIComponent(
            path.id
          )}&date=${encodeURIComponent(date)}&hash=${encodeURIComponent(certHash)}`}
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors py-2"
        >
          <span>Test Validation Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
