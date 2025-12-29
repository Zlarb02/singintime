import { create } from 'zustand'

interface AudioState {
  // Playback state
  isPlaying: boolean
  currentTime: number
  currentBeat: number
  duration: number

  // Metronome
  metronomeEnabled: boolean
  metronomeVolume: number

  // Tempo detection
  isDetectingTempo: boolean
  detectedTempo: number | null
  detectedOffset: number | null

  // Actions
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setCurrentBeat: (beat: number) => void
  setDuration: (duration: number) => void
  setMetronomeEnabled: (enabled: boolean) => void
  setMetronomeVolume: (volume: number) => void
  toggleMetronome: () => void
  setIsDetectingTempo: (detecting: boolean) => void
  setDetectedTempo: (tempo: number | null, offset?: number | null) => void
  reset: () => void
}

export const useAudioStore = create<AudioState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  currentBeat: -1,
  duration: 0,
  metronomeEnabled: true,
  metronomeVolume: 0.5,
  isDetectingTempo: false,
  detectedTempo: null,
  detectedOffset: null,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setDuration: (duration) => set({ duration }),
  setMetronomeEnabled: (metronomeEnabled) => set({ metronomeEnabled }),
  setMetronomeVolume: (metronomeVolume) => set({ metronomeVolume }),
  toggleMetronome: () => set((state) => ({ metronomeEnabled: !state.metronomeEnabled })),
  setIsDetectingTempo: (isDetectingTempo) => set({ isDetectingTempo }),
  setDetectedTempo: (detectedTempo, detectedOffset = null) => set({ detectedTempo, detectedOffset }),
  reset: () => set({
    isPlaying: false,
    currentTime: 0,
    currentBeat: -1,
    detectedTempo: null,
    detectedOffset: null
  })
}))
