// Storage limits configuration

// Per-user limit: 200 MB
export const USER_STORAGE_LIMIT = 200 * 1024 * 1024 // 209715200 bytes

// Global app limit: 8 GB
export const GLOBAL_STORAGE_LIMIT = 8 * 1024 * 1024 * 1024 // 8589934592 bytes

// Max file size per upload: 50 MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
