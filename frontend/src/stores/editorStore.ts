import { create } from 'zustand'
import type {
  TimeSignature,
  Measure,
  Syllable,
  NoteDuration,
  AudioConfig,
  Beat
} from '../types'
import {
  createMeasure,
  createSyllable,
  getSyllableDurationInBeats,
  getMeasureTotalBeats,
  getBeatsPerMeasure,
  toggleTriplet
} from '../types'

// ============================================
// Types
// ============================================

export type EditorMode = 'setup' | 'editor'
export type InputMode = 'click' | 'continuous' | 'import'

interface EditorState {
  // Mode
  mode: EditorMode
  inputMode: InputMode

  // Song metadata
  songId: string | null
  title: string

  // Global settings
  defaultTempo: number
  defaultTimeSignature: TimeSignature

  // Content (v2)
  measures: Measure[]

  // Audio config (v2)
  audioConfig: AudioConfig | null

  // Copyright
  copyrightAcknowledged: boolean

  // Status
  isPublic: boolean
  isDirty: boolean

  // Audio (runtime - not persisted)
  audioFile: File | null
  audioUrl: string | null

  // Selection state
  selectedMeasureId: string | null
  selectedSyllableId: string | null
  currentDuration: NoteDuration

  // Clipboard
  clipboardMeasure: Measure | null

  // Actions - Mode
  setMode: (mode: EditorMode) => void
  setInputMode: (mode: InputMode) => void

  // Actions - Metadata
  setSongId: (id: string | null) => void
  setTitle: (title: string) => void
  setDefaultTempo: (tempo: number) => void
  setDefaultTimeSignature: (sig: TimeSignature) => void
  setCopyrightAcknowledged: (ack: boolean) => void
  setIsPublic: (isPublic: boolean) => void
  setIsDirty: (dirty: boolean) => void

  // Actions - Audio
  setAudioFile: (file: File | null) => void
  setAudioUrl: (url: string | null) => void
  setAudioConfig: (config: AudioConfig | null) => void
  setAudioOffset: (offsetMs: number) => void

  // Actions - Selection
  setSelectedMeasure: (id: string | null) => void
  setSelectedSyllable: (id: string | null) => void
  setCurrentDuration: (duration: NoteDuration) => void

  // Actions - Measures
  addMeasure: () => void
  addMeasures: (count: number) => void
  setMeasureCount: (count: number) => { deletedFilledMeasures: number }
  removeMeasure: (id: string) => void
  setMeasureTempo: (id: string, tempo: number | undefined) => void
  setMeasureTimeSignature: (id: string, sig: TimeSignature | undefined) => void
  getFilledMeasureCount: () => number

  // Actions - Measure manipulation
  copyMeasure: (id: string) => void
  pasteMeasure: (afterId: string) => void
  duplicateMeasure: (id: string) => void
  insertMeasureBefore: (id: string) => void
  insertMeasureAfter: (id: string) => void
  moveMeasureUp: (id: string) => void
  moveMeasureDown: (id: string) => void

  // Actions - Syllables
  addSyllable: (measureId: string, syllable?: Partial<Syllable>) => void
  updateSyllable: (measureId: string, syllableId: string, updates: Partial<Syllable>) => void
  removeSyllable: (measureId: string, syllableId: string) => void
  setSyllableText: (measureId: string, syllableId: string, text: string) => void
  setSyllableDuration: (measureId: string, syllableId: string, duration: NoteDuration) => void
  toggleSyllableDotted: (measureId: string, syllableId: string) => void
  toggleSyllableTied: (measureId: string, syllableId: string) => void
  toggleSyllableTriplet: (measureId: string, syllableId: string) => void

  // Actions - Bulk
  importText: (text: string) => void

  // Utilities
  reset: () => void
  loadSong: (song: SongData) => void
  getMeasureEffectiveTempo: (measure: Measure) => number
  getMeasureEffectiveTimeSignature: (measure: Measure) => TimeSignature
  getSyllablePosition: (syllableId: string) => { startMs: number, endMs: number } | null

  // Legacy compatibility
  getBeatsFromMeasures: () => Beat[]

  // Legacy aliases (v1 compatibility)
  tempo: number
  timeSignature: TimeSignature
  beats: Beat[]
  setTempo: (tempo: number) => void
  setTimeSignature: (sig: TimeSignature) => void
  setBeatText: (index: number, text: string) => void
}

interface SongData {
  id: string
  title: string
  defaultTempo?: number
  defaultTimeSignature?: string
  measures?: string | Measure[]
  audioConfig?: string | AudioConfig | null
  copyrightAcknowledged?: boolean
  isPublic: boolean
  audioPath?: string | null
  // Legacy fields
  tempo?: number
  timeSignature?: string
  beats?: Beat[] | string
}

// ============================================
// Initial state
// ============================================

const DEFAULT_MEASURES = 4

function createInitialMeasures(count: number): Measure[] {
  return Array.from({ length: count }, (_, i) => createMeasure(i))
}

// ============================================
// Store
// ============================================

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  mode: 'setup',
  inputMode: 'click',
  songId: null,
  title: 'Sans titre',
  defaultTempo: 120,
  defaultTimeSignature: '4/4',
  measures: createInitialMeasures(DEFAULT_MEASURES),
  audioConfig: null,
  copyrightAcknowledged: false,
  isPublic: false,
  isDirty: false,
  audioFile: null,
  audioUrl: null,
  selectedMeasureId: null,
  selectedSyllableId: null,
  currentDuration: 'quarter',
  clipboardMeasure: null,

  // Mode actions
  setMode: (mode) => set({ mode }),
  setInputMode: (inputMode) => set({ inputMode }),

  // Metadata actions
  setSongId: (id) => set({ songId: id }),
  setTitle: (title) => set({ title, isDirty: true }),
  setDefaultTempo: (tempo) => set({
    // Support decimal tempo (3 decimal places), min 1 max 400
    defaultTempo: Math.round(Math.max(1, Math.min(400, tempo)) * 1000) / 1000,
    isDirty: true
  }),
  setDefaultTimeSignature: (defaultTimeSignature) => set({
    defaultTimeSignature,
    isDirty: true
  }),
  setCopyrightAcknowledged: (copyrightAcknowledged) => set({
    copyrightAcknowledged,
    isDirty: true
  }),
  setIsPublic: (isPublic) => set({ isPublic, isDirty: true }),
  setIsDirty: (isDirty) => set({ isDirty }),

  // Audio actions
  setAudioFile: (audioFile) => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile)
      set({
        audioFile,
        audioUrl: url,
        audioConfig: {
          path: null, // Will be set on save
          offsetMs: 0,
          volumeNormalize: false
        },
        isDirty: true
      })
    } else {
      set({ audioFile: null, audioUrl: null, audioConfig: null })
    }
  },
  setAudioUrl: (audioUrl) => set({ audioUrl }),
  setAudioConfig: (audioConfig) => set({ audioConfig, isDirty: true }),
  setAudioOffset: (offsetMs) => {
    const current = get().audioConfig
    if (current) {
      set({
        audioConfig: { ...current, offsetMs },
        isDirty: true
      })
    }
  },

  // Selection actions
  setSelectedMeasure: (selectedMeasureId) => set({ selectedMeasureId }),
  setSelectedSyllable: (selectedSyllableId) => set({ selectedSyllableId }),
  setCurrentDuration: (currentDuration) => set({ currentDuration }),

  // Measure actions
  addMeasure: () => {
    const measures = [...get().measures]
    const newMeasure = createMeasure(measures.length)
    measures.push(newMeasure)
    set({ measures, isDirty: true })
  },

  addMeasures: (count: number) => {
    const measures = [...get().measures]
    for (let i = 0; i < count; i++) {
      measures.push(createMeasure(measures.length))
    }
    set({ measures, isDirty: true })
  },

  setMeasureCount: (count: number) => {
    const currentMeasures = get().measures
    const currentCount = currentMeasures.length

    if (count === currentCount) {
      return { deletedFilledMeasures: 0 }
    }

    if (count > currentCount) {
      // Add measures
      const measures = [...currentMeasures]
      for (let i = currentCount; i < count; i++) {
        measures.push(createMeasure(i))
      }
      set({ measures, isDirty: true })
      return { deletedFilledMeasures: 0 }
    } else {
      // Remove measures - count how many filled ones we're deleting
      const measuresToDelete = currentMeasures.slice(count)
      const filledCount = measuresToDelete.filter(m => m.syllables.length > 0).length
      const measures = currentMeasures.slice(0, count)
      measures.forEach((m, i) => m.index = i)
      set({ measures, isDirty: true })
      return { deletedFilledMeasures: filledCount }
    }
  },

  getFilledMeasureCount: () => {
    return get().measures.filter(m => m.syllables.length > 0).length
  },

  // Measure manipulation actions
  copyMeasure: (id) => {
    const measure = get().measures.find(m => m.id === id)
    if (measure) {
      // Deep copy the measure
      set({ clipboardMeasure: JSON.parse(JSON.stringify(measure)) })
    }
  },

  pasteMeasure: (afterId) => {
    const { clipboardMeasure, measures } = get()
    if (!clipboardMeasure) return

    const index = measures.findIndex(m => m.id === afterId)
    if (index === -1) return

    // Create new measure with new IDs
    const newMeasure: Measure = {
      ...JSON.parse(JSON.stringify(clipboardMeasure)),
      id: crypto.randomUUID(),
      index: index + 1,
      syllables: clipboardMeasure.syllables.map(s => ({
        ...s,
        id: crypto.randomUUID()
      }))
    }

    const newMeasures = [...measures]
    newMeasures.splice(index + 1, 0, newMeasure)
    // Re-index
    newMeasures.forEach((m, i) => m.index = i)
    set({ measures: newMeasures, isDirty: true })
  },

  duplicateMeasure: (id) => {
    const measures = get().measures
    const index = measures.findIndex(m => m.id === id)
    if (index === -1) return

    const original = measures[index]
    const newMeasure: Measure = {
      ...JSON.parse(JSON.stringify(original)),
      id: crypto.randomUUID(),
      index: index + 1,
      syllables: original.syllables.map(s => ({
        ...s,
        id: crypto.randomUUID()
      }))
    }

    const newMeasures = [...measures]
    newMeasures.splice(index + 1, 0, newMeasure)
    // Re-index
    newMeasures.forEach((m, i) => m.index = i)
    set({ measures: newMeasures, isDirty: true })
  },

  insertMeasureBefore: (id) => {
    const measures = get().measures
    const index = measures.findIndex(m => m.id === id)
    if (index === -1) return

    const newMeasure = createMeasure(index)
    const newMeasures = [...measures]
    newMeasures.splice(index, 0, newMeasure)
    // Re-index
    newMeasures.forEach((m, i) => m.index = i)
    set({ measures: newMeasures, isDirty: true })
  },

  insertMeasureAfter: (id) => {
    const measures = get().measures
    const index = measures.findIndex(m => m.id === id)
    if (index === -1) return

    const newMeasure = createMeasure(index + 1)
    const newMeasures = [...measures]
    newMeasures.splice(index + 1, 0, newMeasure)
    // Re-index
    newMeasures.forEach((m, i) => m.index = i)
    set({ measures: newMeasures, isDirty: true })
  },

  moveMeasureUp: (id) => {
    const measures = get().measures
    const index = measures.findIndex(m => m.id === id)
    if (index <= 0) return // Already at top

    const newMeasures = [...measures]
    const temp = newMeasures[index - 1]
    newMeasures[index - 1] = newMeasures[index]
    newMeasures[index] = temp
    // Re-index
    newMeasures.forEach((m, i) => m.index = i)
    set({ measures: newMeasures, isDirty: true })
  },

  moveMeasureDown: (id) => {
    const measures = get().measures
    const index = measures.findIndex(m => m.id === id)
    if (index === -1 || index >= measures.length - 1) return // Already at bottom

    const newMeasures = [...measures]
    const temp = newMeasures[index + 1]
    newMeasures[index + 1] = newMeasures[index]
    newMeasures[index] = temp
    // Re-index
    newMeasures.forEach((m, i) => m.index = i)
    set({ measures: newMeasures, isDirty: true })
  },

  removeMeasure: (id) => {
    const measures = get().measures.filter(m => m.id !== id)
    // Re-index remaining measures
    measures.forEach((m, i) => m.index = i)
    set({ measures, isDirty: true })
  },

  setMeasureTempo: (id, tempo) => {
    const measures = get().measures.map(m =>
      m.id === id ? { ...m, tempo } : m
    )
    set({ measures, isDirty: true })
  },

  setMeasureTimeSignature: (id, timeSignature) => {
    const measures = get().measures.map(m =>
      m.id === id ? { ...m, timeSignature } : m
    )
    set({ measures, isDirty: true })
  },

  // Syllable actions
  addSyllable: (measureId, partial = {}) => {
    const { currentDuration } = get()
    const measures = get().measures.map(m => {
      if (m.id !== measureId) return m
      const newSyllable = createSyllable(partial.text ?? '', partial.duration ?? currentDuration)
      return { ...m, syllables: [...m.syllables, { ...newSyllable, ...partial }] }
    })
    set({ measures, isDirty: true })
  },

  updateSyllable: (measureId, syllableId, updates) => {
    const measures = get().measures.map(m => {
      if (m.id !== measureId) return m
      return {
        ...m,
        syllables: m.syllables.map(s =>
          s.id === syllableId ? { ...s, ...updates } : s
        )
      }
    })
    set({ measures, isDirty: true })
  },

  removeSyllable: (measureId, syllableId) => {
    const measures = get().measures.map(m => {
      if (m.id !== measureId) return m
      return {
        ...m,
        syllables: m.syllables.filter(s => s.id !== syllableId)
      }
    })
    set({ measures, isDirty: true })
  },

  setSyllableText: (measureId, syllableId, text) => {
    get().updateSyllable(measureId, syllableId, { text, rest: text === '' })
  },

  setSyllableDuration: (measureId, syllableId, duration) => {
    get().updateSyllable(measureId, syllableId, { duration })
  },

  toggleSyllableDotted: (measureId, syllableId) => {
    const measure = get().measures.find(m => m.id === measureId)
    const syllable = measure?.syllables.find(s => s.id === syllableId)
    if (syllable) {
      get().updateSyllable(measureId, syllableId, { dotted: !syllable.dotted })
    }
  },

  toggleSyllableTied: (measureId, syllableId) => {
    const measure = get().measures.find(m => m.id === measureId)
    const syllable = measure?.syllables.find(s => s.id === syllableId)
    if (syllable) {
      get().updateSyllable(measureId, syllableId, { tied: !syllable.tied })
    }
  },

  toggleSyllableTriplet: (measureId, syllableId) => {
    const measure = get().measures.find(m => m.id === measureId)
    const syllable = measure?.syllables.find(s => s.id === syllableId)
    if (syllable) {
      const newDuration = toggleTriplet(syllable.duration)
      get().updateSyllable(measureId, syllableId, { duration: newDuration })
    }
  },

  // Bulk actions
  importText: (text) => {
    // Split text into words/syllables
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const { defaultTimeSignature, currentDuration } = get()
    const beatsPerMeasure = getBeatsPerMeasure(defaultTimeSignature)

    // Create measures filled with syllables
    const measures: Measure[] = []
    let currentMeasure = createMeasure(0)

    for (const word of words) {
      const syllable = createSyllable(word, currentDuration)
      const syllableDuration = getSyllableDurationInBeats(syllable)
      const currentTotal = getMeasureTotalBeats(currentMeasure)

      // Check if syllable fits in current measure
      if (currentTotal + syllableDuration > beatsPerMeasure) {
        // Start new measure
        measures.push(currentMeasure)
        currentMeasure = createMeasure(measures.length)
      }

      currentMeasure.syllables.push(syllable)
    }

    // Add last measure if it has content
    if (currentMeasure.syllables.length > 0) {
      measures.push(currentMeasure)
    }

    set({ measures, isDirty: true })
  },

  // Utilities
  reset: () => set({
    mode: 'setup',
    inputMode: 'click',
    songId: null,
    title: 'Sans titre',
    defaultTempo: 120,
    defaultTimeSignature: '4/4',
    measures: createInitialMeasures(DEFAULT_MEASURES),
    audioConfig: null,
    copyrightAcknowledged: false,
    isPublic: false,
    isDirty: false,
    audioFile: null,
    audioUrl: null,
    selectedMeasureId: null,
    selectedSyllableId: null,
    currentDuration: 'quarter'
  }),

  loadSong: (song) => {
    // Parse measures (JSON string or array)
    let measures: Measure[]
    if (song.measures) {
      measures = typeof song.measures === 'string'
        ? JSON.parse(song.measures)
        : song.measures
    } else if (song.beats) {
      // Legacy migration: convert beats to measures
      const beats = typeof song.beats === 'string' ? JSON.parse(song.beats) : song.beats
      const beatsPerMeasure = getBeatsPerMeasure(song.timeSignature || '4/4')
      measures = []
      let currentMeasure = createMeasure(0)

      for (let i = 0; i < beats.length; i++) {
        if (currentMeasure.syllables.length >= beatsPerMeasure) {
          measures.push(currentMeasure)
          currentMeasure = createMeasure(measures.length)
        }
        if (beats[i].text) {
          currentMeasure.syllables.push(createSyllable(beats[i].text, 'quarter'))
        }
      }
      if (currentMeasure.syllables.length > 0 || measures.length === 0) {
        measures.push(currentMeasure)
      }
    } else {
      measures = createInitialMeasures(DEFAULT_MEASURES)
    }

    // Parse audio config
    let audioConfig: AudioConfig | null = null
    if (song.audioConfig) {
      audioConfig = typeof song.audioConfig === 'string'
        ? JSON.parse(song.audioConfig)
        : song.audioConfig
    } else if (song.audioPath) {
      // Legacy migration
      audioConfig = {
        path: song.audioPath,
        offsetMs: 0,
        volumeNormalize: false
      }
    }

    // Determine audio URL
    let audioUrl: string | null = null
    if (audioConfig?.path) {
      audioUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${audioConfig.path}`
    } else if (song.audioPath) {
      audioUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${song.audioPath}`
    }

    set({
      mode: 'editor', // Skip setup for existing songs
      songId: song.id,
      title: song.title,
      defaultTempo: song.defaultTempo ?? song.tempo ?? 120,
      defaultTimeSignature: (song.defaultTimeSignature ?? song.timeSignature ?? '4/4') as TimeSignature,
      measures,
      audioConfig,
      copyrightAcknowledged: song.copyrightAcknowledged ?? false,
      isPublic: song.isPublic,
      audioUrl,
      isDirty: false
    })
  },

  getMeasureEffectiveTempo: (measure) => {
    return measure.tempo ?? get().defaultTempo
  },

  getMeasureEffectiveTimeSignature: (measure) => {
    return measure.timeSignature ?? get().defaultTimeSignature
  },

  getSyllablePosition: (syllableId) => {
    const { measures, defaultTempo } = get()
    let currentTimeMs = 0

    for (const measure of measures) {
      const tempo = measure.tempo ?? defaultTempo
      const msPerBeat = 60000 / tempo

      for (const syllable of measure.syllables) {
        const durationBeats = getSyllableDurationInBeats(syllable)
        const durationMs = durationBeats * msPerBeat

        if (syllable.id === syllableId) {
          return {
            startMs: currentTimeMs,
            endMs: currentTimeMs + durationMs
          }
        }

        if (!syllable.tied) {
          currentTimeMs += durationMs
        }
      }
    }

    return null
  },

  // Legacy compatibility - convert measures to beats for old code
  getBeatsFromMeasures: () => {
    const { measures } = get()
    const beats: Beat[] = []
    let index = 0

    for (const measure of measures) {
      for (const syllable of measure.syllables) {
        beats.push({ index: index++, text: syllable.text })
      }
    }

    return beats
  },

  // Legacy aliases (computed from v2 fields)
  get tempo() {
    return get().defaultTempo
  },
  get timeSignature() {
    return get().defaultTimeSignature
  },
  get beats() {
    return get().getBeatsFromMeasures()
  },
  setTempo: (tempo: number) => {
    get().setDefaultTempo(tempo)
  },
  setTimeSignature: (sig: TimeSignature) => {
    get().setDefaultTimeSignature(sig)
  },
  setBeatText: (_index: number, _text: string) => {
    // Legacy: no-op, use new syllable API
    console.warn('setBeatText is deprecated, use updateSyllable instead')
  }
}))
