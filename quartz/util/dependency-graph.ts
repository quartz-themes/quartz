/**
 * Quartz v5 Dependency Graph
 * 
 * Tracks dependencies between content for intelligent incremental builds
 */

import { PageId } from "../plugins/data-model"
import { FilePath } from "./path"

/**
 * Change event type
 */
export interface ChangeEvent {
  type: "add" | "change" | "delete"
  path: FilePath
}

/**
 * Enhanced change information with dependency tracking
 */
export interface ChangeInfo {
  /** Raw change events */
  events: ChangeEvent[]
  
  /** Content IDs affected by changes */
  affected: Set<PageId>
  
  /** Directly changed content */
  direct: Set<PageId>
  
  /** Indirectly affected (via dependencies) */
  indirect: Set<PageId>
}

/**
 * Dependency graph for tracking content relationships
 */
export interface DependencyGraph {
  /** Build dependency graph from content */
  build(content: Array<{ meta: { id: PageId }; links?: { outgoing: Array<{ target: string }> } }>): void
  
  /** Find all content that depends on a given page */
  getDependents(id: PageId): Set<PageId>
  
  /** Find all content that a given page depends on */
  getDependencies(id: PageId): Set<PageId>
  
  /** Update graph incrementally for a single node */
  updateNode(id: PageId, dependencies: PageId[]): void
  
  /** Remove node from graph */
  removeNode(id: PageId): void
  
  /** Clear entire graph */
  clear(): void
}

/**
 * Creates a new dependency graph
 */
export function createDependencyGraph(): DependencyGraph {
  // Forward edges: page -> pages it links to
  const dependencies = new Map<PageId, Set<PageId>>()
  
  // Backward edges: page -> pages that link to it
  const dependents = new Map<PageId, Set<PageId>>()
  
  return {
    build(content) {
      dependencies.clear()
      dependents.clear()
      
      for (const item of content) {
        const id = item.meta.id
        const deps = new Set<PageId>()
        
        // Extract dependencies from links
        if (item.links?.outgoing) {
          for (const link of item.links.outgoing) {
            // Assume target is a PageId or can be converted to one
            const targetId = link.target as PageId
            deps.add(targetId)
            
            // Add to dependents map (backward edge)
            if (!dependents.has(targetId)) {
              dependents.set(targetId, new Set())
            }
            dependents.get(targetId)!.add(id)
          }
        }
        
        dependencies.set(id, deps)
      }
    },
    
    getDependents(id: PageId) {
      return new Set(dependents.get(id) || [])
    },
    
    getDependencies(id: PageId) {
      return new Set(dependencies.get(id) || [])
    },
    
    updateNode(id: PageId, deps: PageId[]) {
      // Remove old backward edges
      const oldDeps = dependencies.get(id) || new Set()
      for (const dep of oldDeps) {
        const depSet = dependents.get(dep)
        if (depSet) {
          depSet.delete(id)
        }
      }
      
      // Add new forward edges
      const newDeps = new Set(deps)
      dependencies.set(id, newDeps)
      
      // Add new backward edges
      for (const dep of newDeps) {
        if (!dependents.has(dep)) {
          dependents.set(dep, new Set())
        }
        dependents.get(dep)!.add(id)
      }
    },
    
    removeNode(id: PageId) {
      // Remove forward edges
      const deps = dependencies.get(id) || new Set()
      for (const dep of deps) {
        const depSet = dependents.get(dep)
        if (depSet) {
          depSet.delete(id)
        }
      }
      dependencies.delete(id)
      
      // Remove backward edges
      const deps2 = dependents.get(id) || new Set()
      for (const dep of deps2) {
        const depSet = dependencies.get(dep)
        if (depSet) {
          depSet.delete(id)
        }
      }
      dependents.delete(id)
    },
    
    clear() {
      dependencies.clear()
      dependents.clear()
    },
  }
}

/**
 * Change tracker for incremental builds
 */
export interface ChangeTracker {
  /** Track a change event */
  track(event: ChangeEvent): void
  
  /** Get affected content based on dependency graph */
  getAffectedContent(graph: DependencyGraph): ChangeInfo
  
  /** Clear tracked changes */
  clear(): void
}

/**
 * Creates a new change tracker
 */
export function createChangeTracker(): ChangeTracker {
  const events: ChangeEvent[] = []
  
  return {
    track(event: ChangeEvent) {
      events.push(event)
    },
    
    getAffectedContent(graph: DependencyGraph) {
      const direct = new Set<PageId>()
      const affected = new Set<PageId>()
      
      // Mark directly changed pages
      for (const event of events) {
        // Convert file path to page ID (simplified)
        const pageId = event.path.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() as PageId
        direct.add(pageId)
        affected.add(pageId)
      }
      
      // Find indirectly affected pages through dependency graph
      const queue = Array.from(direct)
      while (queue.length > 0) {
        const pageId = queue.shift()!
        const dependents = graph.getDependents(pageId)
        
        for (const dependent of dependents) {
          if (!affected.has(dependent)) {
            affected.add(dependent)
            queue.push(dependent)
          }
        }
      }
      
      const indirect = new Set<PageId>()
      for (const id of affected) {
        if (!direct.has(id)) {
          indirect.add(id)
        }
      }
      
      return {
        events: [...events],
        affected,
        direct,
        indirect,
      }
    },
    
    clear() {
      events.length = 0
    },
  }
}
