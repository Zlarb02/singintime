import { Router, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { upload, checkStorageLimits, updateUserStorage, decreaseUserStorage } from '../middleware/upload.js'

const router = Router()

// Get user's songs
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const songs = await prisma.song.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' }
    })
    res.json(songs)
  } catch (error) {
    console.error('Get songs error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Create song (supports v1 and v2)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      // v2 fields
      defaultTempo,
      defaultTimeSignature,
      measures,
      audioConfig,
      copyrightAcknowledged,
      // v1 fields (legacy)
      tempo,
      timeSignature,
      beats,
      isPublic
    } = req.body

    const song = await prisma.song.create({
      data: {
        title: title || 'Sans titre',
        userId: req.userId!,
        // v2 fields
        defaultTempo: defaultTempo || tempo || 120,
        defaultTimeSignature: defaultTimeSignature || timeSignature || '4/4',
        measures: JSON.stringify(measures || []),
        audioConfig: audioConfig ? JSON.stringify(audioConfig) : null,
        copyrightAcknowledged: copyrightAcknowledged || false,
        // v1 fields (for backward compatibility)
        tempo: tempo || defaultTempo || 120,
        timeSignature: timeSignature || defaultTimeSignature || '4/4',
        beats: JSON.stringify(beats || []),
        isPublic: isPublic || false
      }
    })

    res.status(201).json(song)
  } catch (error) {
    console.error('Create song error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Get single song
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const song = await prisma.song.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    })

    if (!song) {
      return res.status(404).json({ error: 'Chanson non trouvée' })
    }

    // Debug: log loaded tempo
    console.log('[DEBUG] Get song - defaultTempo:', song.defaultTempo, '| tempo:', song.tempo)

    res.json(song)
  } catch (error) {
    console.error('Get song error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Update song (supports v1 and v2)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      // v2 fields
      defaultTempo,
      defaultTimeSignature,
      measures,
      audioConfig,
      copyrightAcknowledged,
      // v1 fields (legacy)
      tempo,
      timeSignature,
      beats,
      isPublic
    } = req.body

    // Debug: log tempo values received
    console.log('[DEBUG] Update song - defaultTempo:', defaultTempo, '| tempo:', tempo)

    const existing = await prisma.song.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Chanson non trouvée' })
    }

    // Build update data, preferring v2 fields when available
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title

    // v2 fields
    if (defaultTempo !== undefined) {
      updateData.defaultTempo = defaultTempo
      updateData.tempo = defaultTempo // Sync legacy field
    } else if (tempo !== undefined) {
      updateData.tempo = tempo
      updateData.defaultTempo = tempo // Sync v2 field
    }

    if (defaultTimeSignature !== undefined) {
      updateData.defaultTimeSignature = defaultTimeSignature
      updateData.timeSignature = defaultTimeSignature // Sync legacy field
    } else if (timeSignature !== undefined) {
      updateData.timeSignature = timeSignature
      updateData.defaultTimeSignature = timeSignature // Sync v2 field
    }

    if (measures !== undefined) {
      updateData.measures = JSON.stringify(measures)
    }

    if (audioConfig !== undefined) {
      updateData.audioConfig = audioConfig ? JSON.stringify(audioConfig) : null
    }

    if (copyrightAcknowledged !== undefined) {
      updateData.copyrightAcknowledged = copyrightAcknowledged
    }

    // v1 legacy fields
    if (beats !== undefined) {
      updateData.beats = JSON.stringify(beats)
    }

    if (isPublic !== undefined) {
      updateData.isPublic = isPublic
    }

    const song = await prisma.song.update({
      where: { id: req.params.id },
      data: updateData
    })

    // Debug: log saved tempo
    console.log('[DEBUG] Song saved - defaultTempo:', song.defaultTempo, '| tempo:', song.tempo)

    res.json(song)
  } catch (error) {
    console.error('Update song error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Delete song (with storage cleanup)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.song.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Chanson non trouvée' })
    }

    // Delete audio file if exists
    if (existing.audioPath) {
      const filePath = path.join('./uploads', path.basename(existing.audioPath))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      // Decrease storage
      if (existing.audioSize > 0) {
        await decreaseUserStorage(req.userId!, existing.audioSize)
      }
    }

    await prisma.song.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    console.error('Delete song error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Upload audio (updated for v2 with storage tracking)
router.post('/:id/audio', authMiddleware, checkStorageLimits, upload.single('audio'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.song.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Chanson non trouvée' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Fichier audio requis' })
    }

    const fileSize = req.file.size

    // Check if file exceeds remaining space
    if (req.userStorageRemaining && fileSize > req.userStorageRemaining) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(413).json({
        error: 'Fichier trop volumineux',
        message: `Ce fichier (${Math.round(fileSize / 1024 / 1024)} Mo) dépasse ton espace restant.`
      })
    }

    // Delete old audio file if exists
    if (existing.audioPath) {
      const oldFilePath = path.join('./uploads', path.basename(existing.audioPath))
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath)
        // Decrease old file size from storage
        if (existing.audioSize > 0) {
          await decreaseUserStorage(req.userId!, existing.audioSize)
        }
      }
    }

    const audioPath = `/uploads/${req.file.filename}`

    // Get offset from request body if provided
    const offsetMs = req.body.offsetMs ? parseInt(req.body.offsetMs) : 0

    // Create v2 audioConfig
    const audioConfig = {
      path: audioPath,
      offsetMs,
      volumeNormalize: false
    }

    // Update song with new audio
    const song = await prisma.song.update({
      where: { id: req.params.id },
      data: {
        audioPath,
        audioSize: fileSize,
        audioConfig: JSON.stringify(audioConfig)
      }
    })

    // Update user storage
    await updateUserStorage(req.userId!, fileSize)

    res.json(song)
  } catch (error) {
    console.error('Upload audio error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Update audio offset (v2)
router.patch('/:id/audio-offset', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { offsetMs } = req.body

    const existing = await prisma.song.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Chanson non trouvée' })
    }

    // Parse existing audioConfig or create new one
    let audioConfig = existing.audioConfig
      ? JSON.parse(existing.audioConfig)
      : { path: existing.audioPath, volumeNormalize: false }

    audioConfig.offsetMs = offsetMs ?? 0

    const song = await prisma.song.update({
      where: { id: req.params.id },
      data: {
        audioConfig: JSON.stringify(audioConfig)
      }
    })

    res.json(song)
  } catch (error) {
    console.error('Update audio offset error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
