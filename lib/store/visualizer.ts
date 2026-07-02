import { create } from 'zustand'
import type { CipherStep } from '../cipher/types'

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface VisualizerState {
  activeCipher: string
  input: string
  output: string
  key: string
  direction: 'encrypt' | 'decrypt'
  loading: boolean
  error: string | null
  steps: CipherStep[]
  currentStep: number
  isPlaying: boolean
  instrument: boolean
  theme: 'light' | 'dark'

  setActiveCipher: (cipher: string) => void
  setInput: (input: string) => void
  setOutput: (output: string) => void
  setKey: (key: string) => void
  setDirection: (direction: 'encrypt' | 'decrypt') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSteps: (steps: CipherStep[]) => void
  setCurrentStep: (step: number) => void
  setIsPlaying: (playing: boolean) => void
  setInstrument: (instrument: boolean) => void
  toggleTheme: () => void
  reset: () => void
}

const initialState = {
  activeCipher: 'caesar',
  input: '',
  output: '',
  key: '',
  direction: 'encrypt' as const,
  loading: false,
  error: null,
  steps: [] as CipherStep[],
  currentStep: 0,
  isPlaying: false,
  instrument: true,
  theme: getInitialTheme(),
}

export const useVisualizerStore = create<VisualizerState>((set) => ({
  ...initialState,

  setActiveCipher: (activeCipher) => set({ activeCipher }),
  setInput: (input) => set({ input }),
  setOutput: (output) => set({ output }),
  setKey: (key) => set({ key }),
  setDirection: (direction) => set({ direction }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSteps: (steps) => set({ steps, currentStep: 0 }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setInstrument: (instrument) => set({ instrument }),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', next)
        document.documentElement.classList.toggle('dark', next === 'dark')
      }
      return { theme: next }
    }),
  reset: () => set({ ...initialState, theme: getInitialTheme() }),
}))
