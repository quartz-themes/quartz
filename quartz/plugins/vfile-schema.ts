import { FullSlug, FilePath, SimpleSlug } from "../util/path"

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

  // From LastMod transformer
  dates?: {
    created: Date
    modified: Date
    published: Date
  }

  // From Citations transformer
  citations?: unknown[]

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

declare module "vfile" {
  interface DataMap extends QuartzVFileData {}
}
