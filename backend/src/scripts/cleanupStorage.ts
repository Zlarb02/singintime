/**
 * Storage cleanup and recalculation script
 * Run with: npx ts-node --esm src/scripts/cleanupStorage.ts
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Storage Cleanup & Recalculation ===\n')

  // 1. Get all songs with their audio paths
  const songs = await prisma.song.findMany({
    select: {
      id: true,
      title: true,
      audioPath: true,
      audioSize: true,
      userId: true
    }
  })

  console.log(`Found ${songs.length} songs in database\n`)

  // 2. Build set of valid audio files
  const validFiles = new Set<string>()
  const userStorageMap = new Map<string, number>()

  for (const song of songs) {
    if (song.audioPath) {
      const filename = path.basename(song.audioPath)
      const filePath = path.join('./uploads', filename)

      if (fs.existsSync(filePath)) {
        validFiles.add(filename)
        const stats = fs.statSync(filePath)
        const actualSize = stats.size

        // Update song audioSize if wrong
        if (song.audioSize !== actualSize) {
          console.log(`Fixing audioSize for "${song.title}": ${song.audioSize} -> ${actualSize}`)
          await prisma.song.update({
            where: { id: song.id },
            data: { audioSize: actualSize }
          })
        }

        // Accumulate user storage
        const currentStorage = userStorageMap.get(song.userId) || 0
        userStorageMap.set(song.userId, currentStorage + actualSize)
      } else {
        console.log(`WARNING: File missing for song "${song.title}": ${song.audioPath}`)
        // Clear the audio path since file doesn't exist
        await prisma.song.update({
          where: { id: song.id },
          data: { audioPath: null, audioSize: 0, audioConfig: null }
        })
      }
    }
  }

  // 3. Clean up orphaned files
  const uploadsDir = './uploads'
  if (fs.existsSync(uploadsDir)) {
    const allFiles = fs.readdirSync(uploadsDir)
    let orphanedSize = 0
    let orphanedCount = 0

    for (const file of allFiles) {
      if (!validFiles.has(file)) {
        const filePath = path.join(uploadsDir, file)
        const stats = fs.statSync(filePath)
        orphanedSize += stats.size
        orphanedCount++
        console.log(`Deleting orphaned file: ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`)
        fs.unlinkSync(filePath)
      }
    }

    if (orphanedCount > 0) {
      console.log(`\nDeleted ${orphanedCount} orphaned files (${(orphanedSize / 1024 / 1024).toFixed(1)} MB freed)`)
    } else {
      console.log('\nNo orphaned files found')
    }
  }

  // 4. Update user storage totals
  console.log('\n--- Updating user storage ---')
  const users = await prisma.user.findMany({
    select: { id: true, username: true, storageUsed: true }
  })

  for (const user of users) {
    const actualStorage = userStorageMap.get(user.id) || 0
    if (user.storageUsed !== actualStorage) {
      console.log(`${user.username}: ${user.storageUsed} -> ${actualStorage} bytes (${(actualStorage / 1024 / 1024).toFixed(1)} MB)`)
      await prisma.user.update({
        where: { id: user.id },
        data: { storageUsed: actualStorage }
      })
    } else {
      console.log(`${user.username}: OK (${(actualStorage / 1024 / 1024).toFixed(1)} MB)`)
    }
  }

  // 5. Summary
  console.log('\n=== Summary ===')
  const totalStorage = Array.from(userStorageMap.values()).reduce((a, b) => a + b, 0)
  console.log(`Total storage used: ${(totalStorage / 1024 / 1024).toFixed(1)} MB`)
  console.log(`Users: ${users.length}`)
  console.log(`Songs with audio: ${validFiles.size}`)

  await prisma.$disconnect()
}

main().catch(console.error)
