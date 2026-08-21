'use client'

import { AlertTriangle, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import type { WeakParameterFinding } from '../../lib/security/weakParameters'

interface WeakParameterAlertBannerProps {
  findings: WeakParameterFinding[]
}

export function WeakParameterAlertBanner({ findings }: WeakParameterAlertBannerProps) {
  const [dismissed, setDismissed] = useState<string | null>(null)
  const visible = dismissed ? findings.filter((finding) => finding.id !== dismissed) : findings
  if (!visible.length) return null

  const finding = visible[0]
  const severityClass = finding.severity === 'critical'
    ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
    : finding.severity === 'high'
      ? 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100'
      : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'

  return (
    <aside role="alert" aria-live="polite" className={`rounded-xl border p-4 shadow-sm ${severityClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {finding.severity === 'critical' ? <ShieldAlert className="h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">{finding.title}</h2>
            <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{finding.severity}</span>
            {visible.length > 1 && <span className="text-[11px] opacity-70">+{visible.length - 1} more</span>}
          </div>
          <p className="mt-2 text-xs leading-5 opacity-90">{finding.explanation}</p>
          <p className="mt-2 text-xs leading-5"><strong>Attack / failure mode:</strong> {finding.attackVector}</p>
          <p className="mt-2 text-[11px] opacity-70"><strong>Reference:</strong> {finding.reference}</p>
        </div>
        <button type="button" onClick={() => setDismissed(finding.id)} className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Dismiss security warning">
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
