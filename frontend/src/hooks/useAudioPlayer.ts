import { useEffect, useCallback, useRef } from 'react'
import { Howl } from 'howler'
import { useAudioStore } from '../stores/audioStore'
import { useEditorStore } from '../stores/editorStore'

// Singleton audio manager - shared across all useAudioPlayer instances
let sharedHowl: Howl | null = null
let sharedAudioContext: AudioContext | null = null
let sharedAnimationFrame: number | null = null
let sharedStartTime: number = 0
let sharedPausedTime: number = 0
let currentAudioUrl: string | null = null

// Throttle store updates to reduce re-renders (precise timing handled by usePrecisePlaybackTime)
const STORE_UPDATE_INTERVAL = 50 // ms (~20fps for display, precise sync uses time anchoring)
let lastStoreUpdate: number = 0

// Get or create audio context
function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext()
  }
  return sharedAudioContext
}

// Unlock audio context on first user interaction
async function ensureAudioContextReady(): Promise<void> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

export function useAudioPlayer() {
  // Track if this is the first mount to setup audio
  const isFirstMount = useRef(true)

  const { audioUrl, defaultTempo, measures, defaultTimeSignature, audioConfig } = useEditorStore()
  const {
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setCurrentBeat,
    setDuration,
    reset: resetAudio
  } = useAudioStore()

  // Store ref for accessing fresh values in animation loop
  const storesRef = useRef({ defaultTempo, defaultTimeSignature })
  storesRef.current = { defaultTempo, defaultTimeSignature }

  // Get beats per measure from time signature
  const getBeatsPerMeasure = useCallback((sig: string): number => {
    const [num] = sig.split('/').map(Number)
    return num || 4
  }, [])

  // Calculate beat from time
  const getBeatFromTime = useCallback((time: number): number => {
    const secondsPerBeat = 60 / defaultTempo
    return Math.floor(time / secondsPerBeat)
  }, [defaultTempo])

  // Calculate total duration based on measures (not syllables)
  const getTotalDuration = useCallback((): number => {
    const secondsPerBeat = 60 / defaultTempo
    let totalBeats = 0
    for (const measure of measures) {
      const sig = measure.timeSignature || defaultTimeSignature
      totalBeats += getBeatsPerMeasure(sig)
    }
    // Minimum 4 beats (1 measure)
    totalBeats = Math.max(totalBeats, 4)
    return totalBeats * secondsPerBeat
  }, [defaultTempo, measures, defaultTimeSignature, getBeatsPerMeasure])

  // Animation loop for tracking playback (with audio)
  // Throttled to reduce re-renders - precise timing handled by usePrecisePlaybackTime hook
  const updatePlaybackWithAudio = useCallback(() => {
    if (sharedHowl && sharedHowl.playing()) {
      const now = performance.now()

      // Only update store at throttled rate (for display purposes)
      if (now - lastStoreUpdate >= STORE_UPDATE_INTERVAL) {
        const rawTime = sharedHowl.seek() as number
        // Subtract offset to get "musical time" (where beat 0 starts at offset)
        const offsetSec = (audioConfig?.offsetMs ?? 0) / 1000
        const musicalTime = Math.max(0, rawTime - offsetSec)
        setCurrentTime(musicalTime)
        setCurrentBeat(getBeatFromTime(musicalTime))
        lastStoreUpdate = now
      }

      sharedAnimationFrame = requestAnimationFrame(updatePlaybackWithAudio)
    }
  }, [getBeatFromTime, setCurrentTime, setCurrentBeat, audioConfig])

  // Animation loop for tracking playback (without audio - metronome mode)
  // Throttled to reduce re-renders - precise timing handled by usePrecisePlaybackTime hook
  // Note: Actual metronome clicks are handled by useMetronome hook in GlobalTransportBar
  const updatePlaybackMetronome = useCallback(() => {
    const now = performance.now()
    const elapsed = (now - sharedStartTime) / 1000 + sharedPausedTime
    const totalDuration = getTotalDuration()

    if (elapsed >= totalDuration) {
      // End of song
      setIsPlaying(false)
      setCurrentTime(0)
      setCurrentBeat(-1)
      sharedPausedTime = 0
      if (sharedAnimationFrame) {
        cancelAnimationFrame(sharedAnimationFrame)
        sharedAnimationFrame = null
      }
      return
    }

    // Only update store at throttled rate (for display purposes)
    if (now - lastStoreUpdate >= STORE_UPDATE_INTERVAL) {
      setCurrentTime(elapsed)
      setCurrentBeat(getBeatFromTime(elapsed))
      lastStoreUpdate = now
    }

    sharedAnimationFrame = requestAnimationFrame(updatePlaybackMetronome)
  }, [getBeatFromTime, getTotalDuration, setCurrentTime, setCurrentBeat, setIsPlaying])

  // Initialize/update Howl when audio URL changes
  useEffect(() => {
    // Only recreate if URL actually changed
    if (currentAudioUrl === audioUrl && sharedHowl) {
      return
    }

    // Cleanup previous
    if (sharedAnimationFrame) {
      cancelAnimationFrame(sharedAnimationFrame)
      sharedAnimationFrame = null
    }
    if (sharedHowl) {
      sharedHowl.unload()
      sharedHowl = null
    }

    currentAudioUrl = audioUrl

    if (audioUrl) {
      sharedHowl = new Howl({
        src: [audioUrl],
        html5: true,
        onload: () => {
          if (sharedHowl) {
            setDuration(sharedHowl.duration())
          }
        },
        onplay: () => {
          setIsPlaying(true)
          sharedAnimationFrame = requestAnimationFrame(updatePlaybackWithAudio)
        },
        onpause: () => {
          setIsPlaying(false)
          if (sharedAnimationFrame) {
            cancelAnimationFrame(sharedAnimationFrame)
            sharedAnimationFrame = null
          }
        },
        onstop: () => {
          setIsPlaying(false)
          setCurrentTime(0)
          setCurrentBeat(-1)
          if (sharedAnimationFrame) {
            cancelAnimationFrame(sharedAnimationFrame)
            sharedAnimationFrame = null
          }
        },
        onend: () => {
          setIsPlaying(false)
          setCurrentTime(0)
          setCurrentBeat(-1)
          if (sharedAnimationFrame) {
            cancelAnimationFrame(sharedAnimationFrame)
            sharedAnimationFrame = null
          }
        }
      })
    } else {
      // No audio - set duration based on beats
      setDuration(getTotalDuration())
    }
  }, [audioUrl, setDuration, setIsPlaying, setCurrentTime, setCurrentBeat, updatePlaybackWithAudio, getTotalDuration])

  // Update duration when tempo or measures change (for metronome mode)
  useEffect(() => {
    if (!audioUrl) {
      setDuration(getTotalDuration())
    }
  }, [audioUrl, defaultTempo, measures.length, getTotalDuration, setDuration])

  // Mark first mount complete
  useEffect(() => {
    isFirstMount.current = false
  }, [])

  const play = useCallback(async () => {
    // Ensure audio context is ready (unlocked) before playing
    await ensureAudioContextReady()

    // Reset throttle so first update is immediate
    lastStoreUpdate = 0

    if (audioUrl && sharedHowl) {
      // Apply audio offset if configured (crop from beginning)
      const offsetSec = (audioConfig?.offsetMs ?? 0) / 1000
      // Always seek to offset when starting from beginning or stopped
      const currentPos = sharedHowl.seek() as number
      if (offsetSec > 0 && currentPos < offsetSec) {
        sharedHowl.seek(offsetSec)
      }
      sharedHowl.play()
    } else {
      // Metronome mode - no audio
      setIsPlaying(true)
      sharedStartTime = performance.now()
      sharedAnimationFrame = requestAnimationFrame(updatePlaybackMetronome)
    }
  }, [audioUrl, audioConfig, setIsPlaying, updatePlaybackMetronome])

  const pause = useCallback(() => {
    if (audioUrl && sharedHowl) {
      sharedHowl.pause()
    } else {
      // Metronome mode
      setIsPlaying(false)
      sharedPausedTime += (performance.now() - sharedStartTime) / 1000
      if (sharedAnimationFrame) {
        cancelAnimationFrame(sharedAnimationFrame)
        sharedAnimationFrame = null
      }
    }
  }, [audioUrl, setIsPlaying])

  const stop = useCallback(() => {
    if (audioUrl && sharedHowl) {
      sharedHowl.stop()
    } else {
      // Metronome mode
      setIsPlaying(false)
      sharedPausedTime = 0
      if (sharedAnimationFrame) {
        cancelAnimationFrame(sharedAnimationFrame)
        sharedAnimationFrame = null
      }
    }
    resetAudio()
  }, [audioUrl, resetAudio, setIsPlaying])

  const seek = useCallback((time: number) => {
    if (audioUrl && sharedHowl) {
      // When seeking, add offset to get actual audio file position
      const offsetSec = (audioConfig?.offsetMs ?? 0) / 1000
      sharedHowl.seek(time + offsetSec)
      setCurrentTime(time)
      setCurrentBeat(getBeatFromTime(time))
    } else {
      // Metronome mode
      sharedPausedTime = time
      setCurrentTime(time)
      setCurrentBeat(getBeatFromTime(time))
      if (isPlaying) {
        sharedStartTime = performance.now()
      }
    }
  }, [audioUrl, audioConfig, getBeatFromTime, setCurrentTime, setCurrentBeat, isPlaying])

  const seekToBeat = useCallback((beat: number) => {
    const secondsPerBeat = 60 / defaultTempo
    const time = beat * secondsPerBeat
    seek(time)
  }, [defaultTempo, seek])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const setVolume = useCallback((volume: number) => {
    if (sharedHowl) {
      sharedHowl.volume(volume)
    }
  }, [])

  return {
    play,
    pause,
    stop,
    seek,
    seekToBeat,
    toggle,
    setVolume,
    isReady: audioUrl ? !!sharedHowl : true // Always ready in metronome mode
  }
}
