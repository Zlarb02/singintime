import { create } from 'zustand'

/**
 * Lightweight store for real-time playback state.
 * Uses direct state updates without React re-renders for maximum performance.
 * Components subscribe with selectors and use shallow comparison.
 */

interface SyllablePosition {
  startMs: number
  endMs: number
}

interface PlaybackState {
  // Syllable positions (set once when measures change)
  syllablePositions: Map<string, SyllablePosition>
  setSyllablePositions: (positions: Map<string, SyllablePosition>) => void

  // Active syllable (updated at 60fps during playback)
  activeSyllableId: string | null
  setActiveSyllableId: (id: string | null) => void

  // Playback anchor for CSS animations
  playbackStartTime: number | null  // performance.now() when playback started
  playbackStartPosition: number     // audio position (ms) when playback started
  setPlaybackAnchor: (startTime: number | null, startPosition: number) => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  syllablePositions: new Map(),
  setSyllablePositions: (positions) => set({ syllablePositions: positions }),

  activeSyllableId: null,
  setActiveSyllableId: (id) => set({ activeSyllableId: id }),

  playbackStartTime: null,
  playbackStartPosition: 0,
  setPlaybackAnchor: (startTime, startPosition) => set({
    playbackStartTime: startTime,
    playbackStartPosition: startPosition
  })
}))

// Direct access for high-performance updates (no React re-render)
export function updateActiveSyllable(currentTimeMs: number) {
  const { syllablePositions, activeSyllableId, setActiveSyllableId } = usePlaybackStore.getState()

  for (const [id, pos] of syllablePositions) {
    if (currentTimeMs >= pos.startMs && currentTimeMs < pos.endMs) {
      if (activeSyllableId !== id) {
        setActiveSyllableId(id)
      }
      return
    }
  }

  if (activeSyllableId !== null) {
    setActiveSyllableId(null)
  }
}
