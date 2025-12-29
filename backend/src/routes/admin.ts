import { Router, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { GLOBAL_STORAGE_LIMIT, formatBytes } from '../config/storage.js'

const router = Router()

// Admin middleware - checks if user is admin
async function adminMiddleware(req: AuthRequest, res: Response, next: () => void) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    next()
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

// Get dashboard stats
router.get('/stats', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const [userCount, songCount, users] = await Promise.all([
      prisma.user.count(),
      prisma.song.count(),
      prisma.user.aggregate({ _sum: { storageUsed: true } })
    ])

    const totalStorage = users._sum.storageUsed || 0

    // Get uploads folder size
    let uploadsSize = 0
    const uploadsDir = './uploads'
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir)
      for (const file of files) {
        const stats = fs.statSync(path.join(uploadsDir, file))
        uploadsSize += stats.size
      }
    }

    res.json({
      users: {
        count: userCount,
        max: 40
      },
      songs: songCount,
      storage: {
        used: totalStorage,
        usedFormatted: formatBytes(totalStorage),
        limit: GLOBAL_STORAGE_LIMIT,
        limitFormatted: formatBytes(GLOBAL_STORAGE_LIMIT),
        percentUsed: Math.round((totalStorage / GLOBAL_STORAGE_LIMIT) * 100),
        // Actual disk usage (might differ from DB if orphaned files exist)
        diskUsage: uploadsSize,
        diskUsageFormatted: formatBytes(uploadsSize)
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// List all users
router.get('/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
        _count: { select: { songs: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(users.map(u => ({
      ...u,
      songCount: u._count.songs,
      storageFormatted: formatBytes(u.storageUsed)
    })))
  } catch (error) {
    console.error('List users error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Delete user (and all their data)
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Don't allow deleting yourself
    if (id === req.userId) {
      return res.status(400).json({ error: 'Tu ne peux pas supprimer ton propre compte admin ici' })
    }

    // Get user's songs to delete audio files
    const songs = await prisma.song.findMany({
      where: { userId: id },
      select: { audioPath: true }
    })

    // Delete audio files
    for (const song of songs) {
      if (song.audioPath) {
        const filePath = path.join('./uploads', path.basename(song.audioPath))
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    }

    // Delete user (cascades to songs)
    await prisma.user.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Update user (change storage limit, admin status)
router.patch('/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { storageLimit, isAdmin } = req.body

    const updateData: { storageLimit?: number; isAdmin?: boolean } = {}

    if (storageLimit !== undefined) {
      updateData.storageLimit = storageLimit
    }

    if (isAdmin !== undefined) {
      // Don't allow removing your own admin status
      if (id === req.userId && !isAdmin) {
        return res.status(400).json({ error: 'Tu ne peux pas retirer ton propre statut admin' })
      }
      updateData.isAdmin = isAdmin
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        isAdmin: true,
        storageLimit: true
      }
    })

    res.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Run storage cleanup
router.post('/cleanup', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const results = {
      orphanedFilesDeleted: 0,
      bytesFreed: 0,
      usersUpdated: 0,
      songsFixed: 0
    }

    // Get all songs with audio
    const songs = await prisma.song.findMany({
      select: { id: true, audioPath: true, audioSize: true, userId: true }
    })

    const validFiles = new Set<string>()
    const userStorageMap = new Map<string, number>()

    // Process each song
    for (const song of songs) {
      if (song.audioPath) {
        const filename = path.basename(song.audioPath)
        const filePath = path.join('./uploads', filename)

        if (fs.existsSync(filePath)) {
          validFiles.add(filename)
          const stats = fs.statSync(filePath)

          // Fix audioSize if wrong
          if (song.audioSize !== stats.size) {
            await prisma.song.update({
              where: { id: song.id },
              data: { audioSize: stats.size }
            })
            results.songsFixed++
          }

          // Accumulate storage
          const current = userStorageMap.get(song.userId) || 0
          userStorageMap.set(song.userId, current + stats.size)
        } else {
          // File missing, clear path
          await prisma.song.update({
            where: { id: song.id },
            data: { audioPath: null, audioSize: 0, audioConfig: null }
          })
          results.songsFixed++
        }
      }
    }

    // Delete orphaned files
    const uploadsDir = './uploads'
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir)
      for (const file of files) {
        if (!validFiles.has(file)) {
          const filePath = path.join(uploadsDir, file)
          const stats = fs.statSync(filePath)
          results.bytesFreed += stats.size
          results.orphanedFilesDeleted++
          fs.unlinkSync(filePath)
        }
      }
    }

    // Update user storage
    const users = await prisma.user.findMany({ select: { id: true, storageUsed: true } })
    for (const user of users) {
      const actualStorage = userStorageMap.get(user.id) || 0
      if (user.storageUsed !== actualStorage) {
        await prisma.user.update({
          where: { id: user.id },
          data: { storageUsed: actualStorage }
        })
        results.usersUpdated++
      }
    }

    res.json({
      ...results,
      bytesFreedFormatted: formatBytes(results.bytesFreed)
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
