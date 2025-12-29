import { useRef, useCallback, useEffect } from 'react'
import { useAudioStore } from '../stores/audioStore'
import { useEditorStore } from '../stores/editorStore'

// Singleton audio context
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext()
  }
  return sharedAudioContext
}

// Schedule a click at a precise time using Web Audio API
function scheduleClick(
  ctx: AudioContext,
  time: number,
  frequency: number,
  volume: number
): void {
  if (volume <= 0) return

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.frequency.value = frequency
  oscillator.type = 'sine'

  // Percussive envelope scheduled at exact time
  gainNode.gain.setValueAtTime(volume * 0.6, time)
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08)

  oscillator.start(time)
  oscillator.stop(time + 0.08)
}

// Professional metronome using look-ahead scheduling with time anchoring
const SCHEDULE_AHEAD_TIME = 0.15 // How far ahead to schedule (seconds) - increased for stability
const LOOKAHEAD_INTERVAL = 20 // How often to call scheduler (ms) - decreased for responsiveness

interface UseMetronomeOptions {
  beatsPerMeasure?: number
  onBeat?: (beat: number) => void
  // If true, sync to audio playback time (for when audio is playing)
  syncToAudio?: boolean
}

// Time anchor for audio-synced mode - eliminates jitter from requestAnimationFrame
interface TimeAnchor {
  audioTime: number      // Audio position when anchor was set
  contextTime: number    // AudioContext.currentTime when anchor was set
}

export function useMetronome(options: UseMetronomeOptions = {}) {
  const { beatsPerMeasure = 4, onBeat, syncToAudio = false } = options

  const { defaultTempo, defaultTimeSignature, audioUrl } = useEditorStore()

  // Refs for scheduler state
  const timerRef = useRef<number | null>(null)
  const nextNoteTimeRef = useRef<number>(0)
  const currentBeatRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)
  const lastScheduledBeatRef = useRef<number>(-1)

  // Time anchor for audio-synced mode
  const timeAnchorRef = useRef<TimeAnchor | null>(null)
  const lastAudioTimeRef = useRef<number>(-1)

  // Calculate beats per measure from time signature if not provided
  const effectiveBeatsPerMeasure = beatsPerMeasure || parseInt(defaultTimeSignature.split('/')[0]) || 4

  // Store values in refs for scheduler access
  const tempoRef = useRef(defaultTempo)
  tempoRef.current = defaultTempo

  const beatsPerMeasureRef = useRef(effectiveBeatsPerMeasure)
  beatsPerMeasureRef.current = effectiveBeatsPerMeasure

  const onBeatRef = useRef(onBeat)
  onBeatRef.current = onBeat

  // Determine if we should sync to audio
  const shouldSyncToAudio = syncToAudio && !!audioUrl
  const syncToAudioRef = useRef(shouldSyncToAudio)
  syncToAudioRef.current = shouldSyncToAudio

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    isRunningRef.current = false
    currentBeatRef.current = 0
    lastScheduledBeatRef.current = -1
    timeAnchorRef.current = null
    lastAudioTimeRef.current = -1
  }, [])

  const start = useCallback(() => {
    stop()

    const ctx = getAudioContext()

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    isRunningRef.current = true
    currentBeatRef.current = 0
    lastScheduledBeatRef.current = -1
    timeAnchorRef.current = null
    lastAudioTimeRef.current = -1

    // For independent mode, start scheduling from now
    nextNoteTimeRef.current = ctx.currentTime

    // The scheduler function
    const scheduler = () => {
      if (!isRunningRef.current) return

      const ctx = getAudioContext()
      const secondsPerBeat = 60.0 / tempoRef.current
      const { metronomeEnabled, metronomeVolume, currentTime: storeAudioTime } = useAudioStore.getState()

      if (syncToAudioRef.current) {
        // Audio-synced mode with time anchoring
        // Instead of relying on store's currentTime (updated via requestAnimationFrame),
        // we anchor to a known point and calculate time assuming constant playback speed

        const currentContextTime = ctx.currentTime

        // Detect seek or significant time jump (more than 0.5s difference from expected)
        const needsReanchor = !timeAnchorRef.current ||
          Math.abs(storeAudioTime - lastAudioTimeRef.current) > 0.5

        if (needsReanchor) {
          // Set new anchor point
          timeAnchorRef.current = {
            audioTime: storeAudioTime,
            contextTime: currentContextTime
          }
          lastScheduledBeatRef.current = -1 // Reset to reschedule beats
        }

        lastAudioTimeRef.current = storeAudioTime

        // Calculate current audio time from anchor (assumes 1x playback speed)
        const anchor = timeAnchorRef.current!
        const elapsedSinceAnchor = currentContextTime - anchor.contextTime
        const estimatedAudioTime = anchor.audioTime + elapsedSinceAnchor

        // Calculate which beat we're on based on estimated audio time
        const currentBeatFloat = estimatedAudioTime / secondsPerBeat
        const currentBeatInt = Math.floor(currentBeatFloat)
        const beatInMeasure = ((currentBeatInt % beatsPerMeasureRef.current) + beatsPerMeasureRef.current) % beatsPerMeasureRef.current

        // Schedule upcoming beats within our look-ahead window
        for (let i = 0; i <= 3; i++) {
          const beatToSchedule = currentBeatInt + i

          // Skip if already scheduled or negative beat
          if (beatToSchedule <= lastScheduledBeatRef.current || beatToSchedule < 0) continue

          // Calculate when this beat should play (in AudioContext time)
          const beatAudioTime = beatToSchedule * secondsPerBeat
          const beatContextTime = anchor.contextTime + (beatAudioTime - anchor.audioTime)

          // Only schedule if within our look-ahead window and in the future
          const timeUntilBeat = beatContextTime - currentContextTime
          if (timeUntilBeat >= -0.01 && timeUntilBeat < SCHEDULE_AHEAD_TIME) {
            const scheduleTime = Math.max(currentContextTime, beatContextTime)

            if (metronomeEnabled) {
              const beatInMeasureForSchedule = ((beatToSchedule % beatsPerMeasureRef.current) + beatsPerMeasureRef.current) % beatsPerMeasureRef.current
              const frequency = beatInMeasureForSchedule === 0 ? 1200 : 800
              scheduleClick(ctx, scheduleTime, frequency, metronomeVolume)
            }

            lastScheduledBeatRef.current = beatToSchedule
          }
        }

        // Update current beat for UI
        if (currentBeatRef.current !== beatInMeasure) {
          currentBeatRef.current = beatInMeasure
          onBeatRef.current?.(beatInMeasure)
        }
      } else {
        // Independent mode: use pure look-ahead scheduling
        while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
          if (metronomeEnabled) {
            const frequency = currentBeatRef.current === 0 ? 1200 : 800
            scheduleClick(ctx, nextNoteTimeRef.current, frequency, metronomeVolume)
          }

          onBeatRef.current?.(currentBeatRef.current)

          currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerMeasureRef.current
          nextNoteTimeRef.current += secondsPerBeat
        }
      }

      // Schedule next scheduler call
      timerRef.current = window.setTimeout(scheduler, LOOKAHEAD_INTERVAL)
    }

    // Start the scheduler
    scheduler()
  }, [stop])

  const toggle = useCallback(() => {
    if (isRunningRef.current) {
      stop()
    } else {
      start()
    }
    return !isRunningRef.current
  }, [start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  // Restart metronome if tempo or time signature changes while running
  useEffect(() => {
    if (isRunningRef.current) {
      start()
    }
  }, [defaultTempo, effectiveBeatsPerMeasure, start])

  return {
    start,
    stop,
    toggle,
    isRunning: isRunningRef.current,
    currentBeat: currentBeatRef.current
  }
}

// Hook for playing a single click (for sync testing)
export function useMetronomeClick() {
  const playClick = useCallback((accent: boolean = false) => {
    const { metronomeEnabled, metronomeVolume } = useAudioStore.getState()
    if (!metronomeEnabled) return

    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    scheduleClick(ctx, ctx.currentTime, accent ? 1200 : 800, metronomeVolume)
  }, [])

  return { playClick }
}
