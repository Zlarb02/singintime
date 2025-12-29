import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'

const router = Router()

// Inscription - pseudo + mot de passe, email optionnel
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Choisis un pseudo et un mot de passe' })
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: 'Pseudo entre 2 et 20 caractères' })
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' })
    }

    // Vérifier si pseudo existe
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    })
    if (existingUsername) {
      return res.status(400).json({ error: 'Ce pseudo est déjà pris !' })
    }

    // Vérifier si email existe (si fourni)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      })
      if (existingEmail) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null
      }
    })

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    )

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        hasEmail: !!user.email
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      error: 'Oups, quelque chose a planté. Réessaie !',
      ...(process.env.NODE_ENV !== 'production' && { debug: String(error) })
    })
  }
})

// Connexion
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Pseudo et mot de passe requis' })
    }

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
      return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' })
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' })
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        hasEmail: !!user.email
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Oups, quelque chose a planté. Réessaie !' })
  }
})

// Demander reset password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email requis' })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Ne pas révéler si l'email existe ou non
    if (!user) {
      return res.json({ message: 'Si cet email existe, tu recevras un lien' })
    }

    // Générer token de reset
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 3600000) // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires
      }
    })

    // En prod, envoyer un email ici
    // Pour l'instant, on log le token (à retirer en prod)
    console.log(`Reset token for ${email}: ${resetToken}`)

    res.json({
      message: 'Si cet email existe, tu recevras un lien',
      // En dev uniquement - à retirer en prod
      ...(process.env.NODE_ENV !== 'production' && { devToken: resetToken })
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Oups, quelque chose a planté' })
  }
})

// Reset password avec token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' })
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' })
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return res.status(400).json({ error: 'Lien expiré ou invalide' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null
      }
    })

    res.json({ message: 'Mot de passe changé ! Tu peux te reconnecter' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Oups, quelque chose a planté' })
  }
})

// Vérifier la session
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non connecté' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true }
    })

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' })
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        hasEmail: !!user.email
      }
    })
  } catch {
    res.status(401).json({ error: 'Session expirée, reconnecte-toi !' })
  }
})

export default router
