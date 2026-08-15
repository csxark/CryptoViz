'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import GlobalSearch from '../search/GlobalSearch'
import LanguageSelector from '../i18n/LanguageSelector'
import {
  getDeveloperNavigationItems,
  getNavigationCategories,
} from '@/lib/layout/navigation'
import { useTranslation } from '@/lib/i18n/context'
import { safeGetItem, safeSetItem } from '../../lib/utils/storage'
import { isDevelopmentMode } from '@/lib/utils/env'

export default function Navbar() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null)

  const isDevelopment = isDevelopmentMode()

  /*
   * Single source of truth for navigation.
   *
   * Translation is resolved here because `t` is only available
   * inside the component through the useTranslation hook.
   */
  const navCategories = getNavigationCategories(t, isDevelopment)

  const developerLinks = isDevelopment
    ? getDeveloperNavigationItems(t)
    : []

  useEffect(() => {
    const savedTheme = safeGetItem('theme') as
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

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
        mobileMenuBtnRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'

    setTheme(nextTheme)

    safeSetItem('theme', nextTheme)

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <nav
      className="sticky top-0 z-50 border-b border-zinc-200/20 bg-white/70 backdrop-blur-2xl dark:border-zinc-800/60 dark:bg-zinc-950/70"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02] active:scale-95"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10 transition-colors duration-300 group-hover:bg-teal-500/20">
              <svg
                className="h-6 w-6 text-teal-600 transition-transform duration-300 group-hover:rotate-12 dark:text-teal-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>

              <div className="absolute inset-0 rounded-2xl bg-teal-500/20 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>

            <span className="font-sans text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Crypto
              <span className="text-teal-600 dark:text-teal-400">
                Viz
              </span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden min-w-0 items-center justify-center gap-6 lg:flex xl:gap-10">
          {/* {isDevelopment &&
            developerLinks.map((link) => {
              const isActive =
                pathname.startsWith(link.href) &&
                link.href !== '#'

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`shrink-0 text-[15px] font-semibold transition-all duration-300 ${
                    isActive
                      ? 'text-teal-500'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })} */}

          {navCategories.map((category) => {
            const isCategoryActive = category.href
              ? pathname === category.href
              : category.items?.some(
                  (item) =>
                    pathname?.startsWith(item.href) &&
                    item.href !== '#'
                )

            return (
              <div
                key={category.name}
                className="group relative shrink-0"
              >
                {category.href ? (
                  <Link
                    href={category.href}
                    className={`
                      relative
                      whitespace-nowrap
                      text-[15px]
                      font-semibold
                      transition-all
                      duration-300
                      ${
                        isCategoryActive
                          ? 'text-teal-500'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                      }
                    `}
                  >
                    {category.name}

                    <span
                      className={`
                        absolute
                        -bottom-6
                        left-1/2
                        h-[3px]
                        rounded-full
                        bg-teal-500
                        transition-all
                        duration-300
                        ${
                          isCategoryActive
                            ? 'w-full -translate-x-1/2'
                            : 'w-0 -translate-x-1/2 group-hover:w-full'
                        }
                      `}
                    />
                  </Link>
                ) : (
                  <div className="flex cursor-default items-center py-6 -my-6">
                    <span
                      className={`
                        relative
                        whitespace-nowrap
                        text-[15px]
                        font-semibold
                        transition-all
                        duration-300
                        ${
                          isCategoryActive
                            ? 'text-teal-500'
                            : 'text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-white'
                        }
                      `}
                    >
                      {category.name}

                      <span
                        className={`
                          absolute
                          -bottom-[28px]
                          left-1/2
                          h-[3px]
                          rounded-full
                          bg-teal-500
                          transition-all
                          duration-300
                          ${
                            isCategoryActive
                              ? 'w-full -translate-x-1/2'
                              : 'w-0 -translate-x-1/2 group-hover:w-full'
                          }
                        `}
                      />
                    </span>

                    <div className="invisible absolute left-1/2 top-full mt-4 w-56 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      <div className="flex flex-col gap-1 rounded-xl border border-zinc-200/50 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/95">
                        {category.items?.map((item) => {
                          const isItemActive =
                            pathname?.startsWith(item.href) &&
                            item.href !== '#'

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                                isItemActive
                                  ? 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400'
                                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-white'
                              }`}
                            >
                              {item.name}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right Side */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <GlobalSearch />

          <LanguageSelector />

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="
              flex
              h-10
              w-10
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
              sm:h-12
              sm:w-12
              dark:border-zinc-800
              dark:bg-zinc-900
            "
          >
            {theme === 'dark' ? (
              <svg
                className="h-4 w-4 text-yellow-400 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
                aria-hidden="true"
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

          <button
            ref={mobileMenuBtnRef}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            className="
              flex
              h-10
              w-10
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
              sm:h-12
              sm:w-12
              lg:hidden
              dark:border-zinc-800
              dark:bg-zinc-900
            "
          >
            <svg
              className="h-5 w-5 text-zinc-700 sm:h-6 sm:w-6 dark:text-zinc-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            border-t
            border-zinc-200
            bg-white/95
            backdrop-blur-xl
            lg:hidden
            dark:border-zinc-800
            dark:bg-zinc-950/95
          "
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6">
            {isDevelopment &&
              developerLinks.length > 0 && (
                <div className="py-2">
                  <h3 className="mb-2 px-4 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Developer
                  </h3>

                  <div className="flex flex-col gap-1">
                    {developerLinks.map((item) => {
                      const isActive =
                        pathname?.startsWith(item.href) &&
                        item.href !== '#'

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() =>
                            setIsMobileMenuOpen(false)
                          }
                          className={`
                            rounded-xl py-2.5 pl-8 pr-4
                            text-[15px]
                            font-medium
                            transition-all
                            duration-300
                            ${
                              isActive
                                ? 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400'
                                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                            }
                          `}
                        >
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

            {navCategories.map((category) => {
              if (category.href) {
                const isActive =
                  pathname === category.href

                return (
                  <Link
                    key={category.name}
                    href={category.href}
                    onClick={() =>
                      setIsMobileMenuOpen(false)
                    }
                    className={`
                      rounded-xl px-4 py-3
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
                    {category.name}
                  </Link>
                )
              }

              return (
                <div
                  key={category.name}
                  className="py-2"
                >
                  <h3 className="mb-2 px-4 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {category.name}
                  </h3>

                  <div className="flex flex-col gap-1">
                    {category.items?.map((item) => {
                      const isActive =
                        pathname?.startsWith(item.href) &&
                        item.href !== '#'

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() =>
                            setIsMobileMenuOpen(false)
                          }
                          className={`
                            rounded-xl py-2.5 pl-8 pr-4
                            text-[15px]
                            font-medium
                            transition-all
                            duration-300
                            ${
                              isActive
                                ? 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400'
                                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                            }
                          `}
                        >
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}