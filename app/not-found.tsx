'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/footer'

const CIPHER_CHARS = '01アイウエオカキクケコABCDEF!@#$%^&*'
const COUNTDOWN_START = 10

function GlitchText({ text }: { text: string }) {
    const [display, setDisplay] = useState(text)
    const iterRef = useRef(0)

    useEffect(() => {
        const chars = text.split('')
        const interval = setInterval(() => {
            iterRef.current += 1
            setDisplay(
                chars
                    .map((char, i) =>
                        i < iterRef.current
                            ? char
                            : CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
                    )
                    .join('')
            )
            if (iterRef.current >= chars.length) {
                clearInterval(interval)
                setDisplay(text)
            }
        }, 40)
        return () => clearInterval(interval)
    }, [text])

    useEffect(() => {
        // Periodic re-glitch on a random character
        const glitch = setInterval(() => {
            const idx = Math.floor(Math.random() * text.length)
            setDisplay((prev) => {
                const arr = prev.split('')
                arr[idx] = CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
                return arr.join('')
            })
            setTimeout(() => setDisplay(text), 80)
        }, 2800)
        return () => clearInterval(glitch)
    }, [text])

    return <span aria-label={text}>{display}</span>
}

function MatrixRain() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            canvas.width = canvas.offsetWidth
            canvas.height = canvas.offsetHeight
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        const fontSize = 13
        const cols = Math.floor(canvas.width / fontSize)
        const drops = Array.from({ length: cols }, () => Math.random() * -50)

        // Caps the redraw rate (~24fps is plenty for a background effect
        // and cuts idle CPU/GPU work well below a full 60fps loop).
        const FRAME_INTERVAL = 1000 / 24
        let lastFrameTime = 0
        let prevIsDark: boolean | null = null
        let paused = document.hidden

        let raf: number
        const draw = (time: number) => {
            raf = requestAnimationFrame(draw)
            if (paused) return
            if (time - lastFrameTime < FRAME_INTERVAL) return
            lastFrameTime = time

            // Theme is read per-frame so the rain recolors itself when the
            // user toggles light/dark without needing a remount.
            const isDark = document.documentElement.classList.contains('dark')

            // On an actual theme change, hard-clear instead of fading, so
            // the switch reads as instant rather than a slow crossfade.
            if (prevIsDark !== null && prevIsDark !== isDark) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
            }
            prevIsDark = isDark

            // Trailing fade wash behind the falling characters.
            ctx.fillStyle = isDark ? 'rgba(9,9,11,0.18)' : 'rgba(250,250,251,0.06)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.font = `${fontSize}px monospace`

            drops.forEach((y, i) => {
                const char = CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
                const isBright = Math.random() > 0.92
                // Light mode needs more alpha to read as "bright" against a
                // white page; dark mode is unchanged from before.
                const alpha = isDark ? (isBright ? 1 : 0.35) : (isBright ? 1 : 0.85)
                ctx.fillStyle = isDark ? `rgba(45,212,191,${alpha})` : `rgba(13,148,136,${alpha})`
                ctx.fillText(char, i * fontSize, y * fontSize)
                drops[i] = y > canvas.height / fontSize + Math.random() * 20 ? 0 : y + 1.1
            })
        }
        raf = requestAnimationFrame(draw)

        // Stop drawing entirely when the tab isn't visible.
        const handleVisibility = () => {
            paused = document.hidden
        }
        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full opacity-40 dark:opacity-40"
            aria-hidden="true"
        />
    )
}

export default function NotFound() {
    const router = useRouter()
    const [countdown, setCountdown] = useState(COUNTDOWN_START)
    const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        tickRef.current = setInterval(() => {
            setCountdown((n) => {
                if (n <= 1) {
                    clearInterval(tickRef.current!)
                    return 0
                }
                return n - 1
            })
        }, 1000)

        redirectRef.current = setTimeout(() => {
            router.push('/')
        }, COUNTDOWN_START * 1000)

        return () => {
            clearInterval(tickRef.current!)
            clearTimeout(redirectRef.current!)
        }
    }, [router])

    const handleReturn = () => {
        clearInterval(tickRef.current!)
        clearTimeout(redirectRef.current!)
        // router.push (client-side nav) instead of window.location.href:
        // a hard reload was briefly showing the page in light mode before
        // the dark class was reapplied.
        router.push('/')
    }

    const circumference = 2 * Math.PI * 20
    const progress = ((COUNTDOWN_START - countdown) / COUNTDOWN_START) * circumference

    return (
        <div className="min-h-screen bg-white dark:bg-[#09090B] font-sans transition-colors duration-300 flex flex-col">
            <Navbar />

            <main className="relative flex flex-1 flex-col items-center justify-center overflow-visible px-4 py-16 sm:px-6 lg:px-8">
                <MatrixRain />

                {/* Radial glow */}
                <div
                    className="pointer-events-none absolute inset-0 -z-10"
                    aria-hidden="true"
                >
                    <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-400/8" />
                </div>

                <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 text-center">
                    {/* Terminal card */}
                    <div className="w-full rounded-2xl border border-zinc-200 bg-white/90 shadow-xl backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                        {/* Terminal chrome bar */}
                        <div className="flex items-center gap-1.5 rounded-t-2xl border-b border-zinc-200 bg-zinc-100/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                            <span className="h-3 w-3 rounded-full bg-red-400 dark:bg-red-500" />
                            <span className="h-3 w-3 rounded-full bg-amber-400 dark:bg-amber-500" />
                            <span className="h-3 w-3 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                            <span className="ml-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                                cryptoviz ~ error
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-5 px-6 py-10 sm:px-10">
                            {/* 404 heading */}
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                                    STATUS_CODE
                                </span>
                                <h1 className="font-mono text-8xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-9xl">
                                    <GlitchText text="404" />
                                </h1>
                            </div>

                            {/* Divider with cipher label */}
                            <div className="flex w-full items-center gap-3">
                                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                                    PAGE_NOT_FOUND
                                </span>
                                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                            </div>

                            {/* Message */}
                            <div className="flex flex-col gap-1.5">
                                <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                                    This page didn&apos;t decrypt.
                                </p>
                                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    We couldn&apos;t find the page you&apos;re looking for. It may have moved,
                                    or the link might be out of date.
                                </p>
                            </div>

                            {/* Countdown ring + text */}
                            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/50">
                                <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" className="-rotate-90">
                                    <circle
                                        cx="24" cy="24" r="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        className="text-zinc-200 dark:text-zinc-800"
                                    />
                                    <circle
                                        cx="24" cy="24" r="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={circumference - progress}
                                        strokeLinecap="round"
                                        className="text-teal-500 transition-all duration-1000 ease-linear dark:text-teal-400"
                                    />
                                    <text
                                        x="24" y="24"
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="rotate-90 fill-zinc-900 dark:fill-white font-mono font-bold"
                                        style={{ transform: 'rotate(90deg)', transformOrigin: '24px 24px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700 }}
                                    >
                                        {countdown}
                                    </text>
                                </svg>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Redirecting to Home in{' '}
                                    <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                                        {countdown}s
                                    </span>
                                </p>
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={handleReturn}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-400"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Return Home
                            </button>

                            {/* Footer hint */}
                            <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
                                <span className="text-teal-500">$</span> cd /home &amp;&amp; ./cryptoviz --start
                            </p>
                        </div>
                    </div>

                    {/* Quick nav links */}
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {[
                            { label: 'Playground', href: '/visualizer/caesar/' },
                            { label: 'Docs', href: '/docs' },
                            { label: 'Resources', href: '/resources' },
                        ].map(({ label, href }) => (
                            <Link
                                key={label}
                                href={href}
                                className="font-medium transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                            >
                                {label} &rarr;
                            </Link>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />    

        </div>
    )
}
