'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'


export default function Navbar() {
  const pathname = usePathname()

  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | null

    const systemTheme = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
      ? 'dark'
      : 'light'

    const initialTheme = savedTheme || systemTheme

    setTheme(initialTheme)

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'

    setTheme(nextTheme)

    localStorage.setItem('theme', nextTheme)

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const navLinks = [
    { name: 'Playground', href: '/visualizer/caesar/' },
    { name: 'Advisor', href: '/advisor' },
    { name: 'Modes', href: '/modes' },
    { name: 'Compare', href: '/compare' },
    { name: 'Matrix', href: '/matrix' },
    { name: 'Benchmark', href: '/benchmark' },
    { name: 'Avalanche', href: '/avalanche' },
    { name: 'Merkle Tree', href: '/merkle' },
    { name: 'Padding', href: '/padding' },
    { name: 'Challenge', href: '/challenge' },
    { name: 'Docs', href: '/docs' },
    { name: 'Glossary', href: '/glossary' },
    { name: 'Resources', href: '/resources' },
  ];

  return (
    <nav
      className="sticky top-0 z-50 border-b border-zinc-200/20 bg-white/70 backdrop-blur-2xl dark:border-zinc-800/60 dark:bg-zinc-950/70"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[88px] max-w-[1450px] items-center justify-between px-8 lg:px-12">

        {/* Logo */}

        <Link
          href="/"
          className="group flex items-center gap-4 transition-all duration-300"
        >
          <div
            className="
            flex h-12 w-12 items-center justify-center
            rounded-2xl
            bg-gradient-to-br
            from-teal-500
            to-cyan-500
            text-white
            shadow-lg
            shadow-teal-500/30
            transition-all
            duration-300
            group-hover:scale-110
            group-hover:rotate-6
          "
          >
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[28px] font-black tracking-tight text-zinc-900 dark:text-white">
              Crypto
              <span className="text-teal-500">Viz</span>
            </span>

          
          </div>
        </Link>

        {/* Desktop Navigation */}

        <div className="hidden items-center gap-10 xl:flex">
          {navLinks.map((link) => {
            const isActive =
              pathname.startsWith(link.href) &&
              link.href !== '#'

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`
                  relative
                  text-[15px]
                  font-semibold
                  transition-all
                  duration-300

                  ${
                    isActive
                      ? 'text-teal-500'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }
                `}
              >
                {link.name}

                <span
                  className={`
                    absolute
                    -bottom-3
                    left-1/2
                    h-[3px]
                    rounded-full
                    bg-teal-500
                    transition-all
                    duration-300

                    ${
                      isActive
                        ? 'w-full -translate-x-1/2'
                        : 'w-0 -translate-x-1/2 group-hover:w-full'
                    }
                  `}
                />
              </Link>
            )
          })}
        </div>

        {/* Right Side */}

        <div className="flex items-center gap-4">
                    {/* Theme Toggle */}

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              border
              border-zinc-200
              bg-white
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:shadow-lg
              hover:shadow-teal-500/20
              dark:border-zinc-800
              dark:bg-zinc-900
            "
          >
            {theme === 'dark' ? (
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m8-9h1M3 12H2m15.364-6.364l.707-.707M5.636 18.364l-.707.707m0-13.435l.707.707m12.021 12.021l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 1012 21a9 9 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Mobile Menu Button */}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            className="
              flex
              xl:hidden
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              border
              border-zinc-200
              bg-white
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:shadow-lg
              hover:shadow-teal-500/20
              dark:border-zinc-800
              dark:bg-zinc-900
            "
          >
            <svg
              className="h-6 w-6 text-zinc-700 dark:text-zinc-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}

      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="
            xl:hidden
            border-t
            border-zinc-200
            bg-white/95
            backdrop-blur-xl
            dark:border-zinc-800
            dark:bg-zinc-950/95
          "
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6">
            {navLinks.map((link) => {
              const isActive =
                pathname.startsWith(link.href) &&
                link.href !== '#'

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    rounded-xl
                    px-4
                    py-3
                    text-base
                    font-semibold
                    transition-all
                    duration-300

                    ${
                      isActive
                        ? 'bg-teal-500 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
                    }
                  `}
                >
                  {link.name}
                </Link>
              )
            })}
                      </div>
        </div>
      )}
    </nav>
  )
}