/**
 * Quartz v5 Loader Plugin System
 *
 * Loaders handle non-Markdown input formats and convert them to intermediate representations
 */

import { BuildCtx } from "../util/ctx"
import { VFile } from "vfile"
import { PluginManifest } from "./manifest"
import { FullSlug, FilePath } from "../util/path"
import { StaticResources } from "../util/resources"

/**
 * Content type discriminator
 */
export type ContentKind =
  | "markdown" // Standard Markdown → mdast pipeline
  | "canvas" // Obsidian Canvas → custom AST
  | "database" // Obsidian Database → structured data
  | "asset" // Images, PDFs, etc.
  | "custom" // Plugin-defined content types

/**
 * Loaded content intermediate representation
 */
export type LoadedContent = {
  kind: ContentKind
  data: unknown // Loader-specific data structure
  frontmatter?: Record<string, unknown>
  slug?: FullSlug
}

/**
 * Link extracted from content
 */
export type Link = {
  target: string | FullSlug
  type: LinkType
  text?: string
  meta?: unknown
}

export type LinkType = "wiki" | "markdown" | "url" | "embed" | "custom"

type ExternalResourcesFn = (ctx: BuildCtx) => Partial<StaticResources> | undefined

/**
 * Loader plugin instance
 */
export interface QuartzLoaderPluginInstance extends PluginManifest {
  /** File extensions this loader supports (e.g., [".canvas", ".md", ".mdx"]) */
  supportedExtensions: string[]

  /** Load file and convert to intermediate representation */
  load: (ctx: BuildCtx, file: VFile) => Promise<LoadedContent>

  /** Optional: extract links for graph building */
  extractLinks?: (ctx: BuildCtx, content: LoadedContent) => Link[]

  /** Optional: contribute resources */
  externalResources?: ExternalResourcesFn
}

/**
 * Loader plugin factory type
 */
export type QuartzLoaderPlugin<Options extends object | undefined = undefined> = (
  opts?: Options,
) => QuartzLoaderPluginInstance
