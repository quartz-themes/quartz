/**
 * Quartz v5 Build Cache System
 *
 * Content-addressed caching for faster incremental builds
 */

import { createHash } from "crypto"

/**
 * Cache key based on content hash and plugin metadata
 */
export interface CacheKey {
  /** Hash of input content */
  contentHash: string

  /** Plugin name */
  pluginName: string

  /** Plugin version */
  pluginVersion: string

  /** Hash of plugin options */
  optionsHash: string
}

/**
 * Cached entry with output and metadata
 */
export interface CachedEntry {
  /** Cached output data */
  output: unknown

  /** Timestamp when cached */
  timestamp: number

  /** Dependencies for invalidation */
  dependencies: string[]
}

/**
 * Build cache interface
 */
export interface BuildCache {
  /** Get cached entry by key */
  get(key: CacheKey): Promise<CachedEntry | undefined>

  /** Set cached entry */
  set(key: CacheKey, value: CachedEntry): Promise<void>

  /** Invalidate specific cache entry */
  invalidate(key: CacheKey): Promise<void>

  /** Clear entire cache */
  clear(): Promise<void>

  /** Get cache statistics */
  stats(): Promise<CacheStats>
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  entries: number

  /** Total cache size in bytes */
  size: number

  /** Number of cache hits */
  hits: number

  /** Number of cache misses */
  misses: number
}

/**
 * Creates a cache key string from CacheKey object
 */
export function serializeCacheKey(key: CacheKey): string {
  return `${key.pluginName}@${key.pluginVersion}:${key.contentHash}:${key.optionsHash}`
}

/**
 * Hashes content to create content-addressable key
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").substring(0, 16)
}

/**
 * Hashes plugin options to create cache key component
 */
export function hashOptions(options: unknown): string {
  const optionsStr = JSON.stringify(options || {})
  return createHash("sha256").update(optionsStr).digest("hex").substring(0, 16)
}

/**
 * Creates an in-memory build cache
 */
export function createMemoryCache(): BuildCache {
  const cache = new Map<string, CachedEntry>()
  let hits = 0
  let misses = 0

  return {
    async get(key: CacheKey) {
      const cacheKey = serializeCacheKey(key)
      const entry = cache.get(cacheKey)

      if (entry) {
        hits++
        return entry
      }

      misses++
      return undefined
    },

    async set(key: CacheKey, value: CachedEntry) {
      const cacheKey = serializeCacheKey(key)
      cache.set(cacheKey, value)
    },

    async invalidate(key: CacheKey) {
      const cacheKey = serializeCacheKey(key)
      cache.delete(cacheKey)
    },

    async clear() {
      cache.clear()
      hits = 0
      misses = 0
    },

    async stats() {
      // Calculate total cache size
      let totalSize = 0
      for (const entry of cache.values()) {
        const entryStr = JSON.stringify(entry)
        totalSize += entryStr.length
      }

      return {
        entries: cache.size,
        size: totalSize,
        hits,
        misses,
      }
    },
  }
}

/**
 * Creates a file-based build cache (for persistent caching)
 */
export function createFileCache(cacheDir: string): BuildCache {
  // This would be implemented with file system operations
  // For now, we'll use the memory cache as a fallback
  console.warn("File-based cache not yet implemented, using memory cache")
  return createMemoryCache()
}
