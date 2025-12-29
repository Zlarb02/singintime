import { useRef, useCallback, useEffect, useState } from 'react'
import { useAudioStore } from '../stores/audioStore'

/**
 * Hook that provides precise playback time using time anchoring.
 * Eliminates jitter from requestAnimationFrame-based store updates.
 *
 * Uses the same technique as the metronome:
 * - Captures an anchor point when playback starts
 * - Calculates current time from anchor + elapsed performance.now()
 * - Re-anchors only on seek events (detected by large time jumps)
 */

interface TimeAnchor {
  storeTime: number        // Store's currentTime when anchor was set
  performanceTime: number  // performance.now() when anchor was set
}

export function usePrecisePlaybackTime() {
  // Subscribe only to what we need - reduces re-renders
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const storeTime = useAudioStore((state) => state.currentTime)

  // Precise time state - this is what we return
  const [preciseTime, setPreciseTime] = useState(storeTime)

  // Refs for anchoring
  const anchorRef = useRef<TimeAnchor | null>(null)
  const lastStoreTimeRef = useRef<number>(storeTime)
  const rafRef = useRef<number | null>(null)

  // Detect seek: if store time jumped by more than threshold, we need to re-anchor
  const SEEK_THRESHOLD = 0.3 // seconds

  const updateTime = useCallback(() => {
    // Check isPlaying from store directly (ref-style access for callback)
    if (!useAudioStore.getState().isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const currentStoreTime = useAudioStore.getState().currentTime
    const now = performance.now()

    // Detect seek or first run
    const needsReanchor = !anchorRef.current ||
      Math.abs(currentStoreTime - lastStoreTimeRef.current) > SEEK_THRESHOLD

    if (needsReanchor) {
      anchorRef.current = {
        storeTime: currentStoreTime,
        performanceTime: now
      }
    }

    lastStoreTimeRef.current = currentStoreTime

    // Calculate precise time from anchor
    const anchor = anchorRef.current!
    const elapsedMs = now - anchor.performanceTime
    const estimatedTime = anchor.storeTime + (elapsedMs / 1000)

    setPreciseTime(estimatedTime)

    // Schedule next update
    rafRef.current = requestAnimationFrame(updateTime)
  }, [])

  // Start/stop animation loop based on playing state
  useEffect(() => {
    if (isPlaying) {
      // Reset anchor when starting
      anchorRef.current = {
        storeTime: storeTime,
        performanceTime: performance.now()
      }
      lastStoreTimeRef.current = storeTime
      updateTime()
    } else {
      // When stopped, sync to store time
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      anchorRef.current = null
      setPreciseTime(storeTime)
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, storeTime, updateTime])

  return {
    // Precise playback time in seconds
    currentTime: preciseTime,
    // Current time in milliseconds (convenience)
    currentTimeMs: preciseTime * 1000,
    // Whether currently playing
    isPlaying
  }
}

/**
 * Alternative: Hook that returns a ref instead of state.
 * Use this for maximum performance when you need to read time in callbacks
 * without triggering React re-renders. The caller is responsible for
 * triggering their own updates when needed.
 */
export function usePrecisePlaybackTimeRef() {
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const storeTime = useAudioStore((state) => state.currentTime)

  const timeRef = useRef<number>(storeTime)
  const anchorRef = useRef<TimeAnchor | null>(null)
  const lastStoreTimeRef = useRef<number>(storeTime)
  const rafRef = useRef<number | null>(null)

  const SEEK_THRESHOLD = 0.3

  const updateTime = useCallback(() => {
    if (!useAudioStore.getState().isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const currentStoreTime = useAudioStore.getState().currentTime
    const now = performance.now()

    const needsReanchor = !anchorRef.current ||
      Math.abs(currentStoreTime - lastStoreTimeRef.current) > SEEK_THRESHOLD

    if (needsReanchor) {
      anchorRef.current = {
        storeTime: currentStoreTime,
        performanceTime: now
      }
    }

    lastStoreTimeRef.current = currentStoreTime

    const anchor = anchorRef.current!
    const elapsedMs = now - anchor.performanceTime
    timeRef.current = anchor.storeTime + (elapsedMs / 1000)

    rafRef.current = requestAnimationFrame(updateTime)
  }, [])

  useEffect(() => {
    if (isPlaying) {
      anchorRef.current = {
        storeTime: storeTime,
        performanceTime: performance.now()
      }
      lastStoreTimeRef.current = storeTime
      updateTime()
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      anchorRef.current = null
      timeRef.current = storeTime
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, storeTime, updateTime])

  return timeRef
}
