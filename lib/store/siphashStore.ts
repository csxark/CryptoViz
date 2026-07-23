import { create } from 'zustand'

export interface SipHashState {
  currentStep: number
  isPlaying: boolean
  speed: number
  input: string
  key: string
  cRounds: number
  dRounds: number
  setStep: (step: number) => void
  setPlaying: (playing: boolean) => void
  setSpeed: (speed: number) => void
  setInput: (input: string) => void
  setKey: (key: string) => void
  setRounds: (c: number, d: number) => void
}

export const useSipHashStore = create<SipHashState>((set) => ({
  currentStep: 0,
  isPlaying: false,
  speed: 1,
  input: 'SipHash',
  key: '000102030405060708090a0b0c0d0e0f',
  cRounds: 2,
  dRounds: 4,
  setStep: (step) => set({ currentStep: step }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setSpeed: (speed) => set({ speed }),
  setInput: (input) => set({ input }),
  setKey: (key) => set({ key }),
  setRounds: (c, d) => set({ cRounds: c, dRounds: d }),
}))
