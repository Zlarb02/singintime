import { Router, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { optionalAuth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get public songs
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const songs = await prisma.song.findMany({
      where: { isPublic: true },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    res.json(songs)
  } catch (error) {
    console.error('Gallery error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Get single song - public OR owned by user
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const song = await prisma.song.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { isPublic: true },
          // Si l'utilisateur est connecté, il peut voir ses propres créations
          ...(req.userId ? [{ userId: req.userId }] : [])
        ]
      },
      include: {
        user: {
          select: { username: true }
        }
      }
    })

    if (!song) {
      return res.status(404).json({ error: 'Chanson non trouvée ou accès non autorisé' })
    }

    res.json(song)
  } catch (error) {
    console.error('Get song error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
