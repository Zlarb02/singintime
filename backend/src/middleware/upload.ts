import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { USER_STORAGE_LIMIT, GLOBAL_STORAGE_LIMIT, MAX_FILE_SIZE } from '../config/storage.js'
import { AuthRequest } from './auth.js'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, './uploads')
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Format audio non supporté. Utilisez MP3 ou WAV.'))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
})

// Middleware to check storage limits BEFORE upload
export async function checkStorageLimits(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' })
    }

    // Get user's current storage
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true, storageLimit: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    // Check user limit (we'll check actual file size after upload)
    if (user.storageUsed >= user.storageLimit) {
      return res.status(413).json({
        error: 'Espace de stockage épuisé',
        message: `Tu as atteint ta limite de ${Math.round(user.storageLimit / 1024 / 1024)} Mo. Supprime des chansons pour libérer de l'espace.`
      })
    }

    // Check global limit
    const globalUsage = await prisma.user.aggregate({
      _sum: { storageUsed: true }
    })
    const totalUsed = globalUsage._sum.storageUsed || 0

    if (totalUsed >= GLOBAL_STORAGE_LIMIT) {
      return res.status(503).json({
        error: 'Stockage global saturé',
        message: "L'application a atteint sa capacité maximale. Contacte l'admin."
      })
    }

    // Store remaining space for post-upload check
    req.userStorageRemaining = user.storageLimit - user.storageUsed
    req.globalStorageRemaining = GLOBAL_STORAGE_LIMIT - totalUsed

    next()
  } catch (error) {
    console.error('Storage check error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

// Update user storage after successful upload
export async function updateUserStorage(userId: string, fileSize: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      storageUsed: { increment: fileSize }
    }
  })
}

// Decrease user storage when file is deleted
export async function decreaseUserStorage(userId: string, fileSize: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      storageUsed: { decrement: fileSize }
    }
  })
}
