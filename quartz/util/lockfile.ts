/**
 * Quartz v5 Lockfile System
 *
 * Manages plugin versions and ensures reproducible builds
 */

export interface Lockfile {
  /** Lockfile format version */
  version: string

  /** Quartz version */
  quartzVersion: string

  /** Resolved plugin information */
  plugins: {
    [name: string]: {
      /** Resolved plugin version */
      version: string

      /** Resolution source (e.g., npm package, git URL, local path) */
      resolved: string

      /** Package integrity hash */
      integrity?: string

      /** Plugin dependencies */
      dependencies?: Record<string, string>
    }
  }

  /** ISO timestamp when lockfile was generated */
  generated: string
}

/**
 * Creates a new lockfile
 */
export function createLockfile(quartzVersion: string): Lockfile {
  return {
    version: "1.0.0",
    quartzVersion,
    plugins: {},
    generated: new Date().toISOString(),
  }
}

/**
 * Adds a plugin to the lockfile
 */
export function addPluginToLockfile(
  lockfile: Lockfile,
  name: string,
  version: string,
  resolved: string,
  integrity?: string,
  dependencies?: Record<string, string>,
): void {
  lockfile.plugins[name] = {
    version,
    resolved,
    integrity,
    dependencies,
  }
  lockfile.generated = new Date().toISOString()
}

/**
 * Verifies lockfile integrity
 */
export function verifyLockfile(lockfile: Lockfile): boolean {
  if (!lockfile.version || !lockfile.quartzVersion || !lockfile.plugins) {
    return false
  }

  for (const [name, plugin] of Object.entries(lockfile.plugins)) {
    if (!plugin.version || !plugin.resolved) {
      console.warn(`Invalid plugin entry in lockfile: ${name}`)
      return false
    }
  }

  return true
}

/**
 * Serializes lockfile to JSON string
 */
export function serializeLockfile(lockfile: Lockfile): string {
  return JSON.stringify(lockfile, null, 2)
}

/**
 * Parses lockfile from JSON string
 */
export function parseLockfile(content: string): Lockfile {
  const lockfile = JSON.parse(content) as Lockfile

  if (!verifyLockfile(lockfile)) {
    throw new Error("Invalid lockfile format")
  }

  return lockfile
}
