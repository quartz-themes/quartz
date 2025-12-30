/**
 * Quartz v5 Plugin Manifest System
 * 
 * Provides versioning, capability negotiation, and dependency management for plugins
 */

export interface PluginManifest {
  /** Plugin name (should be unique) */
  name: string
  
  /** Plugin version (semver format, e.g., "1.2.3") */
  version: string
  
  /** Quartz plugin API version requirement (semver range like "^5.0" or exact version like "5.0.0") */
  apiVersion: string
  
  /** Optional capabilities (e.g., "incremental", "streaming") */
  capabilities?: string[]
  
  /** Plugin dependencies with version constraints */
  dependencies?: Record<string, string>
}

/**
 * Validates a plugin manifest
 */
export function validatePluginManifest(manifest: PluginManifest): boolean {
  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new Error('Plugin manifest must have a valid name')
  }
  
  if (!manifest.version || typeof manifest.version !== 'string') {
    throw new Error(`Plugin ${manifest.name} must have a valid version`)
  }
  
  if (!manifest.apiVersion || typeof manifest.apiVersion !== 'string') {
    throw new Error(`Plugin ${manifest.name} must have a valid apiVersion`)
  }
  
  return true
}

/**
 * Checks if a plugin supports a specific capability
 */
export function hasCapability(manifest: PluginManifest, capability: string): boolean {
  return manifest.capabilities?.includes(capability) ?? false
}

/**
 * Gets all plugin dependencies
 */
export function getPluginDependencies(manifest: PluginManifest): Record<string, string> {
  return manifest.dependencies ?? {}
}
