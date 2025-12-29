import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { USER_STORAGE_LIMIT, GLOBAL_STORAGE_LIMIT, formatBytes } from '../config/storage.js'

const router = Router()

// Get current user profile
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
        _count: {
          select: { songs: true }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    // Get global storage stats
    const globalUsage = await prisma.user.aggregate({
      _sum: { storageUsed: true }
    })
    const globalUsed = globalUsage._sum.storageUsed || 0

    res.json({
      ...user,
      songCount: user._count.songs,
      storage: {
        used: user.storageUsed,
        limit: user.storageLimit,
        usedFormatted: formatBytes(user.storageUsed),
        limitFormatted: formatBytes(user.storageLimit),
        percentUsed: Math.round((user.storageUsed / user.storageLimit) * 100)
      },
      globalStorage: {
        used: globalUsed,
        limit: GLOBAL_STORAGE_LIMIT,
        usedFormatted: formatBytes(globalUsed),
        limitFormatted: formatBytes(GLOBAL_STORAGE_LIMIT),
        percentUsed: Math.round((globalUsed / GLOBAL_STORAGE_LIMIT) * 100)
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Update profile (username, email)
router.put('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email } = req.body

    // Check if username is taken by another user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: req.userId }
        }
      })
      if (existingUser) {
        return res.status(400).json({ error: 'Ce nom est déjà pris' })
      }
    }

    // Check if email is taken by another user
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: req.userId }
        }
      })
      if (existingEmail) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
    }

    const updateData: { username?: string; email?: string | null } = {}
    if (username) updateData.username = username
    if (email !== undefined) updateData.email = email || null

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true
      }
    })

    res.json(user)
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Change password
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mots de passe requis' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword }
    })

    res.json({ message: 'Mot de passe mis à jour' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Delete account
router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // This will cascade delete all songs due to onDelete: Cascade
    // But we need to manually delete audio files
    const songs = await prisma.song.findMany({
      where: { userId: req.userId },
      select: { audioPath: true }
    })

    // Delete audio files
    const fs = await import('fs')
    const path = await import('path')
    for (const song of songs) {
      if (song.audioPath) {
        const filePath = path.join('./uploads', path.basename(song.audioPath))
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    }

    // Delete user (cascades to songs)
    await prisma.user.delete({
      where: { id: req.userId }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
