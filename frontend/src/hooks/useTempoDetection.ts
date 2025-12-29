import { useCallback } from 'react'
import { guess } from 'web-audio-beat-detector'
import { useAudioStore } from '../stores/audioStore'

interface TempoDetectionResult {
  bpm: number
  offset: number
}

export function useTempoDetection() {
  const { setIsDetectingTempo, setDetectedTempo } = useAudioStore()

  const detectTempo = useCallback(async (file: File): Promise<TempoDetectionResult | null> => {
    setIsDetectingTempo(true)
    setDetectedTempo(null, null)

    try {
      // Create audio context
      const audioContext = new AudioContext()

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Use guess() which returns BPM and offset
      const result = await guess(audioBuffer)

      // Round to 3 decimal places
      const bpm = Math.round(result.bpm * 1000) / 1000
      const offset = Math.round(result.offset * 1000) // Convert to ms

      setDetectedTempo(bpm, offset)

      // Clean up
      await audioContext.close()

      return { bpm, offset }
    } catch (error) {
      console.error('Tempo detection failed:', error)
      setDetectedTempo(null, null)
      return null
    } finally {
      setIsDetectingTempo(false)
    }
  }, [setIsDetectingTempo, setDetectedTempo])

  const detectTempoFromUrl = useCallback(async (url: string): Promise<TempoDetectionResult | null> => {
    setIsDetectingTempo(true)
    setDetectedTempo(null, null)

    try {
      // Fetch the audio file
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()

      // Create audio context
      const audioContext = new AudioContext()

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Use guess() which returns BPM and offset
      const result = await guess(audioBuffer)

      // Round to 3 decimal places
      const bpm = Math.round(result.bpm * 1000) / 1000
      const offset = Math.round(result.offset * 1000) // Convert to ms

      setDetectedTempo(bpm, offset)

      // Clean up
      await audioContext.close()

      return { bpm, offset }
    } catch (error) {
      console.error('Tempo detection failed:', error)
      setDetectedTempo(null, null)
      return null
    } finally {
      setIsDetectingTempo(false)
    }
  }, [setIsDetectingTempo, setDetectedTempo])

  return {
    detectTempo,
    detectTempoFromUrl
  }
}
