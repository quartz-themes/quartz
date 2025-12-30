/**
 * Quartz v5 Lockfile Generator
 *
 * Generates lockfiles from current plugin configuration
 */

import { QuartzConfig } from "../cfg"
import { Lockfile, createLockfile, addPluginToLockfile, serializeLockfile } from "./lockfile"
import { PluginManifest } from "../plugins/manifest"
import { readFileSync } from "fs"
import path from "path"

/**
 * Gets the Quartz version from package.json
 */
function getQuartzVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json")
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
    return packageJson.version || "unknown"
  } catch (error) {
    console.warn("Could not read Quartz version from package.json")
    return "unknown"
  }
}

/**
 * Generates a lockfile from the current Quartz configuration
 */
export function generateLockfileFromConfig(config: QuartzConfig): Lockfile {
  const quartzVersion = getQuartzVersion()
  const lockfile = createLockfile(quartzVersion)

  // Process all plugin types
  const allPlugins = [
    ...(config.plugins.loaders || []),
    ...config.plugins.transformers,
    ...config.plugins.filters,
    ...config.plugins.emitters,
  ]

  for (const plugin of allPlugins) {
    // Check if plugin has manifest information
    const manifest = plugin as Partial<PluginManifest>

    if (manifest.name) {
      const version = manifest.version || "1.0.0"
      const resolved = `builtin:${manifest.name}@${version}`

      addPluginToLockfile(
        lockfile,
        manifest.name,
        version,
        resolved,
        undefined,
        manifest.dependencies,
      )
    }
  }

  return lockfile
}

/**
 * Writes lockfile to disk
 */
export async function writeLockfile(lockfile: Lockfile, outputPath: string): Promise<void> {
  const { writeFile } = await import("fs/promises")
  const content = serializeLockfile(lockfile)
  await writeFile(outputPath, content, "utf-8")
}
