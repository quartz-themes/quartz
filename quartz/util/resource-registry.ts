/**
 * Quartz v5 Enhanced Resource Management
 * 
 * Resource registry for better control over CSS/JS resources with
 * deduplication, optimization, and SRI support
 */

import { JSX } from "preact/jsx-runtime"
import { QuartzPluginData } from "../plugins/vfile"
import { StaticResources } from "./resources"
import { EmittedAssetRef } from "../plugins/data-model"

/**
 * v5 Enhanced CSS Resource with priority and security features
 */
export type CSSResourceV5 = {
  content: string                     // URL or inline content
  inline?: boolean                    // Inline vs linked
  spaPreserve?: boolean               // Preserve across SPA navigation
  media?: string                      // Media query
  integrity?: string                  // SRI hash
  priority?: "critical" | "normal" | "lazy"  // Load priority
}

/**
 * v5 Enhanced JS Resource with priority and security features
 */
export type JSResourceV5 = {
  loadTime: "beforeDOMReady" | "afterDOMReady"
  moduleType?: "module" | "nomodule"
  spaPreserve?: boolean
  integrity?: string                  // SRI hash
  priority?: "critical" | "normal" | "lazy"
  defer?: boolean
  async?: boolean
} & (
  | { src: string; contentType: "external" }
  | { script: string; contentType: "inline" }
)

/**
 * Resource Registry Interface
 * 
 * Provides centralized management of resources with deduplication and optimization
 */
export interface ResourceRegistry {
  /** Register CSS resource */
  registerCSS(resource: CSSResourceV5): void
  
  /** Register JS resource */
  registerJS(resource: JSResourceV5): void
  
  /** Register static asset */
  registerAsset(asset: EmittedAssetRef): void
  
  /** Register head element */
  registerHeadElement(element: JSX.Element | ((data: QuartzPluginData) => JSX.Element)): void
  
  /** Get all CSS resources */
  getCSS(): CSSResourceV5[]
  
  /** Get all JS resources */
  getJS(): JSResourceV5[]
  
  /** Get all assets */
  getAssets(): EmittedAssetRef[]
  
  /** Get all head elements */
  getHeadElements(): (JSX.Element | ((data: QuartzPluginData) => JSX.Element))[]
  
  /** Deduplicate resources */
  deduplicate(): void
  
  /** Optimize resources (minification, bundling, etc.) */
  optimize(): void
  
  /** Convert to v4 StaticResources for backward compatibility */
  toStaticResources(): StaticResources
}

/**
 * Creates a new resource registry
 */
export function createResourceRegistry(): ResourceRegistry {
  const css: CSSResourceV5[] = []
  const js: JSResourceV5[] = []
  const assets: EmittedAssetRef[] = []
  const headElements: (JSX.Element | ((data: QuartzPluginData) => JSX.Element))[] = []
  
  return {
    registerCSS(resource: CSSResourceV5) {
      css.push(resource)
    },
    
    registerJS(resource: JSResourceV5) {
      js.push(resource)
    },
    
    registerAsset(asset: EmittedAssetRef) {
      assets.push(asset)
    },
    
    registerHeadElement(element: JSX.Element | ((data: QuartzPluginData) => JSX.Element)) {
      headElements.push(element)
    },
    
    getCSS() {
      return [...css]
    },
    
    getJS() {
      return [...js]
    },
    
    getAssets() {
      return [...assets]
    },
    
    getHeadElements() {
      return [...headElements]
    },
    
    deduplicate() {
      // Deduplicate CSS by content
      const seenCss = new Set<string>()
      for (let i = css.length - 1; i >= 0; i--) {
        if (seenCss.has(css[i].content)) {
          css.splice(i, 1)
        } else {
          seenCss.add(css[i].content)
        }
      }
      
      // Deduplicate JS by src/script
      const seenJs = new Set<string>()
      for (let i = js.length - 1; i >= 0; i--) {
        const key = js[i].contentType === "external" ? js[i].src : js[i].script
        if (seenJs.has(key)) {
          js.splice(i, 1)
        } else {
          seenJs.add(key)
        }
      }
      
      // Deduplicate assets by ID
      const seenAssets = new Set<string>()
      for (let i = assets.length - 1; i >= 0; i--) {
        if (seenAssets.has(assets[i].id)) {
          assets.splice(i, 1)
        } else {
          seenAssets.add(assets[i].id)
        }
      }
    },
    
    optimize() {
      // Sort resources by priority
      css.sort((a, b) => {
        const priorityOrder = { critical: 0, normal: 1, lazy: 2 }
        const aPriority = priorityOrder[a.priority || "normal"]
        const bPriority = priorityOrder[b.priority || "normal"]
        return aPriority - bPriority
      })
      
      js.sort((a, b) => {
        const priorityOrder = { critical: 0, normal: 1, lazy: 2 }
        const aPriority = priorityOrder[a.priority || "normal"]
        const bPriority = priorityOrder[b.priority || "normal"]
        return aPriority - bPriority
      })
    },
    
    toStaticResources(): StaticResources {
      // Convert v5 resources to v4 format for backward compatibility
      return {
        css: css.map(r => ({
          content: r.content,
          inline: r.inline,
          spaPreserve: r.spaPreserve,
        })),
        js: js.map(r => ({
          loadTime: r.loadTime,
          moduleType: r.moduleType,
          spaPreserve: r.spaPreserve,
          ...(r.contentType === "external" 
            ? { src: r.src, contentType: "external" as const }
            : { script: r.script, contentType: "inline" as const }
          ),
        })),
        additionalHead: headElements,
      }
    },
  }
}
