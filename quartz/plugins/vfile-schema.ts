import { FullSlug, FilePath, SimpleSlug } from "../util/path"
import type { Element } from "hast"
import type { Root as HtmlRoot } from "hast"

/**
 * Core data set by the processing pipeline before any plugins
 */
export interface CoreVFileData {
  slug: FullSlug
  filePath: FilePath
  relativePath: FilePath
}

/**
 * Table of Contents entry structure
 */
export interface TocEntry {
  depth: number
  text: string
  slug: string // anchor slug (without "#" prefix, e.g., "some-heading")
}

/**
 * Data contributed by transformer plugins
 */
export interface TransformerVFileData {
  // From FrontMatter transformer
  frontmatter?:
    | ({ [key: string]: unknown } & {
        title: string
      } & Partial<{
          tags: string[]
          aliases: string[]
          modified: string
          created: string
          published: string
          description: string
          socialDescription: string
          publish: boolean | string
          draft: boolean | string
          lang: string
          enableToc: string
          cssclasses: string[]
          socialImage: string
          comments: boolean | string
        }>)
    | undefined
  aliases?: FullSlug[]

  // From TableOfContents transformer
  toc?: TocEntry[]
  collapseToc?: boolean

  // From CrawlLinks transformer
  links?: SimpleSlug[]

  // From Description transformer
  description?: string
  text?: string

  // From LastMod transformer
  dates?: {
    created: Date
    modified: Date
    published: Date
  }

  // From Citations transformer
  citations?: unknown[]

  // From ObsidianFlavoredMarkdown transformer
  blocks?: Record<string, Element>
  htmlAst?: HtmlRoot
  hasMermaidDiagram?: boolean

  // From Latex transformer
  // (adds external resources but no data to vfile)

  // From Syntax transformer
  // (adds external resources but no data to vfile)
}

/**
 * Data contributed by emitter plugins
 */
export interface EmitterVFileData {
  // Emitters typically don't add to vfile.data
  // but may read from it
}

/**
 * Complete vfile data map
 */
export interface QuartzVFileData extends CoreVFileData, TransformerVFileData, EmitterVFileData {}

/**
 * TypeScript module augmentation for vfile.
 *
 * Note: Individual transformer plugins also have their own `declare module "vfile"`
 * blocks. This is intentional and not a duplication issue. TypeScript merges all
 * module augmentation declarations, allowing:
 * 1. Built-in plugins to have their types centralized here for documentation
 * 2. Custom/third-party plugins to extend the DataMap with their own fields
 *
 * This design supports plugin extensibility while maintaining a central schema
 * for built-in plugin data.
 */
declare module "vfile" {
  interface DataMap extends QuartzVFileData {}
}
