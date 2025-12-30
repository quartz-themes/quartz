/**
 * Quartz v5 Layout Registry
 * 
 * Pre-registered layouts that can be selected via frontmatter
 */

import { FullPageLayout } from "../cfg"

/**
 * Layout definition with metadata
 */
export interface LayoutDefinition {
  /** Unique layout identifier */
  id: string
  
  /** Human-readable name */
  name: string
  
  /** Optional description */
  description?: string
  
  /** The actual layout configuration */
  layout: FullPageLayout
}

/**
 * Layout registry interface
 */
export interface LayoutRegistry {
  /** Register a new layout */
  register(id: string, definition: LayoutDefinition): void
  
  /** Get a layout by ID */
  get(id: string): LayoutDefinition | undefined
  
  /** List all registered layout IDs */
  list(): string[]
  
  /** Check if a layout exists */
  has(id: string): boolean
}

/**
 * Creates a new layout registry
 */
export function createLayoutRegistry(): LayoutRegistry {
  const layouts = new Map<string, LayoutDefinition>()
  
  return {
    register(id: string, definition: LayoutDefinition) {
      if (layouts.has(id)) {
        console.warn(`Layout "${id}" is already registered, overwriting`)
      }
      layouts.set(id, definition)
    },
    
    get(id: string) {
      return layouts.get(id)
    },
    
    list() {
      return Array.from(layouts.keys())
    },
    
    has(id: string) {
      return layouts.has(id)
    },
  }
}

/**
 * Helper function to define a layout with type checking
 */
export function defineLayout(definition: LayoutDefinition): LayoutDefinition {
  if (!definition.id || typeof definition.id !== 'string') {
    throw new Error('Layout must have a valid id')
  }
  
  if (!definition.name || typeof definition.name !== 'string') {
    throw new Error(`Layout "${definition.id}" must have a valid name`)
  }
  
  if (!definition.layout) {
    throw new Error(`Layout "${definition.id}" must have a layout configuration`)
  }
  
  return definition
}
