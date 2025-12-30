import { useRef, useCallback, useEffect } from 'react'
import { useAudioStore } from '../stores/audioStore'
import { useEditorStore } from '../stores/editorStore'
import { DURATION_INFO } from '../types'

// Singleton audio context
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext()
  }
  return sharedAudioContext
}

// Schedule a beep at a precise time - shorter, higher pitched than metronome
function scheduleBeep(
  ctx: AudioContext,
  time: number,
  volume: number
): void {
  if (volume <= 0) return

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  // Higher frequency, shorter duration for "pop" sound
  oscillator.frequency.value = 600
  oscillator.type = 'triangle'

  // Very short percussive envelope
  gainNode.gain.setValueAtTime(volume * 0.5, time)
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05)

  oscillator.start(time)
  oscillator.stop(time + 0.05)
}

// Look-ahead scheduling parameters
const SCHEDULE_AHEAD_TIME = 0.15 // seconds
const LOOKAHEAD_INTERVAL = 20 // ms

interface SyllableEvent {
  id: string
  startMs: number
  hasText: boolean
}

interface TimeAnchor {
  audioTime: number
  contextTime: number
}

interface UseFlowBeepOptions {
  syncToAudio?: boolean
}

export function useFlowBeep(options: UseFlowBeepOptions = {}) {
  const { syncToAudio = false } = options

  const { measures, defaultTempo, audioUrl, audioConfig } = useEditorStore()

  // Refs for scheduler state
  const timerRef = useRef<number | null>(null)
  const isRunningRef = useRef<boolean>(false)
  const scheduledSyllablesRef = useRef<Set<string>>(new Set())
  const syllableEventsRef = useRef<SyllableEvent[]>([])
  const timeAnchorRef = useRef<TimeAnchor | null>(null)
  const lastAudioTimeRef = useRef<number>(-1)

  // Determine if we should sync to audio
  const shouldSyncToAudio = syncToAudio && !!audioUrl
  const syncToAudioRef = useRef(shouldSyncToAudio)
  syncToAudioRef.current = shouldSyncToAudio

  // Build syllable events list from measures
  const buildSyllableEvents = useCallback(() => {
    const events: SyllableEvent[] = []
    let currentTimeMs = 0

    for (const measure of measures) {
      const tempo = measure.tempo ?? defaultTempo
      const msPerBeat = 60000 / tempo

      for (const syllable of measure.syllables) {
        // Only add syllables with text (not rests)
        const hasText = !!(syllable.text && syllable.text.trim().length > 0 && !syllable.rest)

        events.push({
          id: syllable.id,
          startMs: currentTimeMs,
          hasText
        })

        // Calculate duration
        const info = DURATION_INFO[syllable.duration]
        let beats = info.beats
        if (syllable.dotted) beats *= 1.5
        const durationMs = beats * msPerBeat

        if (!syllable.tied) {
          currentTimeMs += durationMs
        }
      }
    }

    syllableEventsRef.current = events
  }, [measures, defaultTempo])

  // Update syllable events when measures change
  useEffect(() => {
    buildSyllableEvents()
  }, [buildSyllableEvents])

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    isRunningRef.current = false
    scheduledSyllablesRef.current.clear()
    timeAnchorRef.current = null
    lastAudioTimeRef.current = -1
  }, [])

  const start = useCallback(() => {
    stop()
    buildSyllableEvents()

    const ctx = getAudioContext()

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    isRunningRef.current = true
    scheduledSyllablesRef.current.clear()
    timeAnchorRef.current = null
    lastAudioTimeRef.current = -1

    const scheduler = () => {
      if (!isRunningRef.current) return

      const ctx = getAudioContext()
      const { beepEnabled, beepVolume, currentTime: storeAudioTime } = useAudioStore.getState()
      const currentContextTime = ctx.currentTime

      // Calculate estimated audio time using time anchoring
      let estimatedAudioTimeMs: number

      if (syncToAudioRef.current) {
        // Detect seek or significant time jump
        const needsReanchor = !timeAnchorRef.current ||
          Math.abs(storeAudioTime - lastAudioTimeRef.current) > 0.3

        if (needsReanchor) {
          timeAnchorRef.current = {
            audioTime: storeAudioTime,
            contextTime: currentContextTime
          }
          scheduledSyllablesRef.current.clear()
        }

        lastAudioTimeRef.current = storeAudioTime

        const anchor = timeAnchorRef.current!
        const elapsedSinceAnchor = currentContextTime - anchor.contextTime
        estimatedAudioTimeMs = (anchor.audioTime + elapsedSinceAnchor) * 1000
      } else {
        // Non-audio mode: use store time directly
        estimatedAudioTimeMs = storeAudioTime * 1000
      }

      // Schedule upcoming syllable beeps within look-ahead window
      if (beepEnabled) {
        for (const event of syllableEventsRef.current) {
          // Skip if already scheduled or no text
          if (scheduledSyllablesRef.current.has(event.id) || !event.hasText) continue

          // Calculate when this syllable should beep (in AudioContext time)
          const syllableContextTime = syncToAudioRef.current && timeAnchorRef.current
            ? timeAnchorRef.current.contextTime + (event.startMs / 1000 - timeAnchorRef.current.audioTime)
            : currentContextTime + (event.startMs - estimatedAudioTimeMs) / 1000

          // Only schedule if within look-ahead window and in the future
          const timeUntilSyllable = syllableContextTime - currentContextTime
          if (timeUntilSyllable >= -0.01 && timeUntilSyllable < SCHEDULE_AHEAD_TIME) {
            const scheduleTime = Math.max(currentContextTime, syllableContextTime)
            scheduleBeep(ctx, scheduleTime, beepVolume)
            scheduledSyllablesRef.current.add(event.id)
          }
        }
      }

      // Schedule next scheduler call
      timerRef.current = window.setTimeout(scheduler, LOOKAHEAD_INTERVAL)
    }

    scheduler()
  }, [stop, buildSyllableEvents, audioConfig])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    start,
    stop,
    isRunning: isRunningRef.current
  }
}
