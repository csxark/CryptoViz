import type { CipherDefinition } from '../../lib/cipher/registry'
import type { CipherErrorCode } from '../../lib/utils/errors'
import SandboxInputs from './SandboxInputs'

interface SandboxToolbarProps {
  cipher: CipherDefinition
  input: string
  setInput: (value: string) => void
  key: string
  setKey: (value: string) => void
  action: "encrypt" | "decrypt"
  setAction: (value: "encrypt" | "decrypt") => void
  hexInput: boolean
  setHexInput: (value: boolean) => void
  rounds: number
  setRounds: (value: number) => void
  demoMode: boolean
  setDemoMode: (value: boolean) => void
  bobSecret: string
  setBobSecret: (value: string) => void
  aesMode: string
  setAesMode: (value: string) => void
  padding: boolean
  setPadding: (value: boolean) => void
  autoCompute: boolean
  setAutoCompute: (value: boolean) => void
  loading: boolean
  onRun: () => void
  error: string | null
  workerError: string | null
}

export default function SandboxToolbar({
  cipher,
  input,
  setInput,
  key,
  setKey,
  action,
  setAction,
  hexInput,
  setHexInput,
  rounds,
  setRounds,
  demoMode,
  setDemoMode,
  bobSecret,
  setBobSecret,
  aesMode,
  setAesMode,
  padding,
  setPadding,
  autoCompute,
  setAutoCompute,
  loading,
  onRun,
  error,
  workerError,
}: SandboxToolbarProps) {
  return (
    <>
      {/* Action toggle (Encrypt / Decrypt) */}
      {cipher.category !== "hash" && cipher.id !== "dh" && (
        <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
          <button
            onClick={() => setAction("encrypt")}
            className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
              action === "encrypt"
                ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Encrypt / Sign
          </button>
          <button
            onClick={() => setAction("decrypt")}
            className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
              action === "decrypt"
                ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Decrypt / Verify
          </button>
        </div>
      )}

      <SandboxInputs
        cipher={cipher}
        input={input}
        setInput={setInput}
        key={key}
        setKey={setKey}
        action={action}
        hexInput={hexInput}
        setHexInput={setHexInput}
        rounds={rounds}
        setRounds={setRounds}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        bobSecret={bobSecret}
        setBobSecret={setBobSecret}
        aesMode={aesMode}
        setAesMode={setAesMode}
        padding={padding}
        setPadding={setPadding}
      />

      {/* Run button + Auto Compute toggle */}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={onRun}
          disabled={loading}
          className="h-10 flex-1 flex items-center justify-center rounded-lg bg-teal-600 text-center text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-teal-500 hover:shadow-md focus:outline-none disabled:opacity-50 disabled:hover:scale-100 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Running in Web Worker...
            </span>
          ) : (
            "Run Computation"
          )}
        </button>
        <label
          className={`h-10 flex items-center gap-3 rounded-lg border px-3.5 text-xs font-semibold cursor-pointer select-none transition-all duration-200 ${
            autoCompute
              ? "border-teal-500/30 bg-teal-50/10 text-teal-700 dark:border-teal-500/30 dark:bg-teal-950/20 dark:text-teal-400"
              : "border-zinc-200 bg-zinc-50/30 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/10 dark:text-zinc-400 dark:hover:bg-zinc-900/30 dark:hover:border-zinc-700"
          }`}
        >
          <span className="tracking-wide">Auto Compute</span>
          <input
            type="checkbox"
            checked={autoCompute}
            onChange={(e) => setAutoCompute(e.target.checked)}
            className="relative h-5 w-9 cursor-pointer appearance-none rounded-full border border-zinc-300 bg-zinc-200 transition-all duration-200 before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow-sm before:transition-all before:duration-200 checked:border-teal-600 checked:bg-teal-600 checked:before:translate-x-4 dark:border-zinc-700 dark:bg-zinc-700 dark:before:bg-zinc-100 dark:checked:border-teal-500 dark:checked:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </label>
      </div>

      {/* Errors Display */}
      {(error || workerError) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-950/40 dark:bg-red-950/10">
          <div className="flex gap-2.5">
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-bold text-red-800 dark:text-red-300">
                Execution Error
              </h4>
              <p className="text-xs text-red-700 dark:text-red-400">
                {error || workerError || 'Unknown error'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
