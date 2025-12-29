// ============================================
// SingInTime v2 - Notation musicale complète
// ============================================

// Durées musicales (toutes les valeurs possibles)
export type NoteDuration =
  | 'whole'           // Ronde (4 temps)
  | 'half'            // Blanche (2 temps)
  | 'quarter'         // Noire (1 temps)
  | 'eighth'          // Croche (1/2 temps)
  | 'sixteenth'       // Double-croche (1/4 temps)
  | 'thirtysecond'    // Triple-croche (1/8 temps)
  | 'triplet-half'    // Triolet blanche
  | 'triplet-quarter' // Triolet noire
  | 'triplet-eighth'  // Triolet croche
  | 'triplet-sixteenth' // Triolet double-croche

// Labels explicatifs pour l'UI (non-musiciens)
export interface DurationInfo {
  name: string
  desc: string
  beats: number
  symbol: string
}

export const DURATION_INFO: Record<NoteDuration, DurationInfo> = {
  'whole':              { name: 'Ronde',              desc: '4 temps - très long',      beats: 4,       symbol: '1' },
  'half':               { name: 'Blanche',            desc: '2 temps - long',           beats: 2,       symbol: '2' },
  'quarter':            { name: 'Noire',              desc: '1 temps - normal',         beats: 1,       symbol: '4' },
  'eighth':             { name: 'Croche',             desc: '1/2 temps - rapide',       beats: 0.5,     symbol: '8' },
  'sixteenth':          { name: 'Double-croche',      desc: '1/4 temps - très rapide',  beats: 0.25,    symbol: '16' },
  'thirtysecond':       { name: 'Triple-croche',      desc: '1/8 temps - ultra rapide', beats: 0.125,   symbol: '32' },
  'triplet-half':       { name: 'Triolet blanche',    desc: '3 pour 4 temps',           beats: 1.333,   symbol: '2³' },
  'triplet-quarter':    { name: 'Triolet noire',      desc: '3 pour 2 temps',           beats: 0.667,   symbol: '4³' },
  'triplet-eighth':     { name: 'Triolet croche',     desc: '3 pour 1 temps',           beats: 0.333,   symbol: '8³' },
  'triplet-sixteenth':  { name: 'Triolet double',     desc: '3 pour 1/2 temps',         beats: 0.167,   symbol: '16³' },
}

// Accents et dynamiques
export type Accent = 'normal' | 'strong' | 'ghost' | 'staccato'

// Syllabe - unité de base
export interface Syllable {
  id: string
  text: string
  duration: NoteDuration
  dotted: boolean      // Pointée (x1.5 durée)
  tied: boolean        // Liée à la syllabe suivante
  accent: Accent
  rest: boolean        // Silence (pas de texte)
}

// Mesure
export interface Measure {
  id: string
  index: number
  syllables: Syllable[]
  timeSignature?: TimeSignature  // Override local (optionnel)
  tempo?: number                  // Override local (optionnel)
}

// Configuration audio
export interface AudioConfig {
  path: string | null
  offsetMs: number           // Décalage début (crop)
  volumeNormalize: boolean
}

// Chanson (Song) - nouveau modèle v2
export interface SongV2 {
  id: string
  title: string
  userId: string

  // Configuration globale
  defaultTempo: number
  defaultTimeSignature: TimeSignature

  // Contenu
  measures: Measure[]

  // Audio
  audio: AudioConfig | null

  // Métadonnées
  isPublic: boolean
  copyrightAcknowledged: boolean
  createdAt: string
  updatedAt: string
  user?: {
    username: string
  }
}

// ============================================
// Types legacy (v1) - gardés pour compatibilité
// ============================================

export interface Beat {
  index: number
  text: string
}

export interface Song {
  id: string
  title: string
  userId: string
  // v2 fields
  defaultTempo?: number
  defaultTimeSignature?: string
  measures?: string | Measure[]
  audioConfig?: string | AudioConfig | null
  copyrightAcknowledged?: boolean
  // v1 legacy fields
  tempo: number
  timeSignature: string
  beats: Beat[] | string
  audioPath: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  user?: {
    username: string
  }
}

export interface User {
  id: string
  username: string
  isAdmin?: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

// ============================================
// Signatures temporelles
// ============================================

export type TimeSignature = '2/4' | '3/4' | '4/4' | '5/4' | '6/8' | '7/8' | '12/8'

export interface TimeSignatureInfo {
  value: TimeSignature
  label: string
  beatsPerMeasure: number
  beatUnit: number  // 4 = noire, 8 = croche
}

export const TIME_SIGNATURES: TimeSignatureInfo[] = [
  { value: '2/4',  label: '2/4',  beatsPerMeasure: 2,  beatUnit: 4 },
  { value: '3/4',  label: '3/4',  beatsPerMeasure: 3,  beatUnit: 4 },
  { value: '4/4',  label: '4/4',  beatsPerMeasure: 4,  beatUnit: 4 },
  { value: '5/4',  label: '5/4',  beatsPerMeasure: 5,  beatUnit: 4 },
  { value: '6/8',  label: '6/8',  beatsPerMeasure: 6,  beatUnit: 8 },
  { value: '7/8',  label: '7/8',  beatsPerMeasure: 7,  beatUnit: 8 },
  { value: '12/8', label: '12/8', beatsPerMeasure: 12, beatUnit: 8 },
]

export function getBeatsPerMeasure(sig: string): number {
  const found = TIME_SIGNATURES.find(t => t.value === sig)
  return found?.beatsPerMeasure ?? 4
}

export function getBeatUnit(sig: string): number {
  const found = TIME_SIGNATURES.find(t => t.value === sig)
  return found?.beatUnit ?? 4
}

// ============================================
// Utilitaires
// ============================================

export function parseBeats(beats: Beat[] | string): Beat[] {
  if (typeof beats === 'string') {
    try {
      return JSON.parse(beats)
    } catch {
      return []
    }
  }
  return beats
}

// Calculer la durée en temps d'une syllabe
export function getSyllableDurationInBeats(syllable: Syllable): number {
  let beats = DURATION_INFO[syllable.duration].beats
  if (syllable.dotted) {
    beats *= 1.5
  }
  return beats
}

// Créer une nouvelle syllabe avec valeurs par défaut
export function createSyllable(text: string = '', duration: NoteDuration = 'quarter'): Syllable {
  return {
    id: crypto.randomUUID(),
    text,
    duration,
    dotted: false,
    tied: false,
    accent: 'normal',
    rest: text === '',
  }
}

// Créer une mesure vide
export function createMeasure(index: number): Measure {
  return {
    id: crypto.randomUUID(),
    index,
    syllables: [],
  }
}

// Calculer la durée totale d'une mesure en temps
export function getMeasureTotalBeats(measure: Measure): number {
  return measure.syllables.reduce((total, syl) => {
    return total + getSyllableDurationInBeats(syl)
  }, 0)
}

// Vérifier si une mesure est complète selon sa signature
export function isMeasureComplete(measure: Measure, timeSignature: TimeSignature): boolean {
  const expectedBeats = getBeatsPerMeasure(timeSignature)
  const actualBeats = getMeasureTotalBeats(measure)
  return Math.abs(actualBeats - expectedBeats) < 0.001
}

// Convertir durée en millisecondes
export function beatsToMs(beats: number, tempo: number): number {
  const msPerBeat = 60000 / tempo
  return beats * msPerBeat
}

// Convertir millisecondes en beats
export function msToBeats(ms: number, tempo: number): number {
  const msPerBeat = 60000 / tempo
  return ms / msPerBeat
}

// Ordre des durées pour x2 et /2
const DURATION_ORDER: NoteDuration[] = [
  'thirtysecond',  // 1/8
  'sixteenth',     // 1/4
  'eighth',        // 1/2
  'quarter',       // 1
  'half',          // 2
  'whole',         // 4
]

const TRIPLET_DURATION_ORDER: NoteDuration[] = [
  'triplet-sixteenth',
  'triplet-eighth',
  'triplet-quarter',
  'triplet-half',
]

// Doubler la durée (x2)
export function doubleDuration(duration: NoteDuration): NoteDuration {
  const isTriplet = duration.startsWith('triplet')
  const order = isTriplet ? TRIPLET_DURATION_ORDER : DURATION_ORDER
  const idx = order.indexOf(duration)
  if (idx === -1 || idx === order.length - 1) return duration
  return order[idx + 1]
}

// Diviser la durée par 2 (/2)
export function halveDuration(duration: NoteDuration): NoteDuration {
  const isTriplet = duration.startsWith('triplet')
  const order = isTriplet ? TRIPLET_DURATION_ORDER : DURATION_ORDER
  const idx = order.indexOf(duration)
  if (idx <= 0) return duration
  return order[idx - 1]
}
