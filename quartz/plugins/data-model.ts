/**
 * Quartz v5 Enhanced Data Model
 * 
 * Extended content model with better metadata, links, and asset tracking
 */

import { FullSlug, FilePath } from "../util/path"
import { Root as HtmlRoot } from "hast"
import { Root as MdRoot } from "mdast"
import { VFile } from "vfile"
import { ContentKind } from "../plugins/loader"

/**
 * Unique page identifier (content-addressable)
 */
export type PageId = string

/**
 * Link type discriminator
 */
export type LinkType = "wiki" | "markdown" | "url" | "embed" | "canvas" | "custom"

/**
 * Page metadata
 */
export interface PageMeta {
  /** Unique content-addressable ID */
  id: PageId
  
  /** URL slug */
  slug: FullSlug
  
  /** Source-relative path */
  filePath: FilePath
  
  /** Output-relative path (e.g., foo/index.html) */
  outPath: string
  
  /** Page title */
  title?: string
  
  /** Tags */
  tags: string[]
  
  /** Creation date */
  created?: Date
  
  /** Last modified date */
  updated?: Date
  
  /** Draft status */
  draft?: boolean
  
  /** Publish status */
  publish?: boolean
  
  /** Content type */
  contentKind: ContentKind
  
  /** Selected layout ID */
  layoutId?: string
}

/**
 * Link information
 */
export interface Links {
  /** Outgoing links from this page */
  outgoing: Array<{
    target: PageId | FullSlug
    type: LinkType
    text?: string
    meta?: unknown
  }>
  
  /** Incoming links to this page */
  incoming: Array<{
    source: PageId | FullSlug
    type: LinkType
    text?: string
    meta?: unknown
  }>
}

/**
 * Asset type discriminator
 */
export type AssetType = "css" | "js" | "font" | "image" | "wasm" | "other"

/**
 * Emitted asset reference
 */
export interface EmittedAssetRef {
  /** Unique asset ID */
  id: string
  
  /** Output-relative path */
  relPath: string
  
  /** Asset type */
  type: AssetType
  
  /** SRI hash for security */
  integrity?: string
  
  /** File size in bytes */
  size?: number
  
  /** Content hash for cache busting */
  hash?: string
}

/**
 * Canvas AST node placeholder
 * (To be fully implemented when Canvas support is added)
 */
export interface CanvasNode {
  type: "canvas"
  nodes: unknown[]
  edges: unknown[]
}

/**
 * Database AST node placeholder
 * (To be fully implemented when Database support is added)
 */
export interface DatabaseNode {
  type: "database"
  schema: unknown
  rows: unknown[]
}

/**
 * v5 Enhanced processed content
 * Maintains v4 compatibility while adding new features
 */
export interface ProcessedContentV5 {
  /** Enhanced metadata */
  meta: PageMeta
  
  /** Frontmatter data */
  frontmatter: Record<string, unknown>
  
  /** Markdown AST (for markdown content) */
  mdast?: MdRoot
  
  /** HTML AST (for markdown content) */
  hast?: HtmlRoot
  
  /** Canvas AST (for canvas content) */
  canvasAst?: CanvasNode
  
  /** Database AST (for database content) */
  databaseAst?: DatabaseNode
  
  /** Rendered HTML (content slot) */
  html?: string
  
  /** Link graph */
  links: Links
  
  /** Associated assets */
  assets?: EmittedAssetRef[]
  
  /** Plugin-specific data storage */
  data?: Record<string, unknown>
  
  /** v4 compatibility: original vfile */
  vfile: VFile
}

/**
 * Creates default empty links
 */
export function createEmptyLinks(): Links {
  return {
    outgoing: [],
    incoming: [],
  }
}

/**
 * Creates a page ID from a file path (simple hash for now)
 */
export function createPageId(filePath: FilePath): PageId {
  // Simple content-addressable ID based on file path
  // In a more complete implementation, this could be a hash of content + metadata
  return filePath.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()
}
