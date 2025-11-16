import { BuildCtx } from "../util/ctx"
import {
  FullSlug,
  FilePath,
  SimpleSlug,
  RelativeURL,
  TransformOptions,
  slugifyFilePath,
  simplifySlug,
  transformLink,
  pathToRoot,
  splitAnchor,
  joinSegments,
  getAllSegmentPrefixes,
  getFileExtension,
  isAbsoluteURL,
  isRelativeURL,
  resolveRelative,
  slugTag,
  stripSlashes,
  QUARTZ,
} from "../util/path"
import { JSResource, CSSResource } from "../util/resources"
import { escapeHTML, unescapeHTML } from "../util/escape"

/**
 * Plugin utility interface providing abstraction over common utility functions
 */
export interface PluginUtilities {
  // Path operations
  path: {
    slugify: (path: FilePath) => FullSlug
    simplify: (slug: FullSlug) => SimpleSlug
    transform: (from: FullSlug, to: string, opts: TransformOptions) => RelativeURL
    toRoot: (slug: FullSlug) => RelativeURL
    split: (slug: string) => [string, string]
    join: (...segments: string[]) => string
    getAllSegmentPrefixes: (tags: string) => string[]
    getFileExtension: (s: string) => string | undefined
    isAbsoluteURL: (s: string) => boolean
    isRelativeURL: (s: string) => boolean
    resolveRelative: (current: FullSlug, target: FullSlug | SimpleSlug) => RelativeURL
    slugTag: (tag: string) => string
    stripSlashes: (s: string, onlyStripPrefix?: boolean) => string
    QUARTZ: string
  }

  // Resource management
  resources: {
    createExternalJS: (src: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => JSResource
    createInlineJS: (script: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => JSResource
    createCSS: (resource: CSSResource) => CSSResource
  }

  // HTML escape utilities
  escape: {
    html: (text: string) => string
    unescape: (html: string) => string
  }
}

/**
 * Extended BuildCtx with utility functions for plugins
 */
export interface PluginContext extends BuildCtx {
  utils?: PluginUtilities
}

/**
 * Create plugin utilities implementation
 */
export function createPluginUtilities(): PluginUtilities {
  return {
    path: {
      slugify: slugifyFilePath,
      simplify: simplifySlug,
      transform: transformLink,
      toRoot: pathToRoot,
      split: (slug: string) => {
        const [path, anchor] = splitAnchor(slug)
        return [path, anchor]
      },
      join: (...segments: string[]) => joinSegments(...segments),
      getAllSegmentPrefixes,
      getFileExtension,
      isAbsoluteURL,
      isRelativeURL,
      resolveRelative,
      slugTag,
      stripSlashes,
      QUARTZ,
    },
    resources: {
      createExternalJS: (
        src: string,
        loadTime: "beforeDOMReady" | "afterDOMReady" = "afterDOMReady",
      ) => ({
        src,
        contentType: "external" as const,
        loadTime,
      }),
      createInlineJS: (
        script: string,
        loadTime: "beforeDOMReady" | "afterDOMReady" = "afterDOMReady",
      ) => ({
        script,
        contentType: "inline" as const,
        loadTime,
      }),
      createCSS: (resource: CSSResource) => resource,
    },
    escape: {
      html: escapeHTML,
      unescape: unescapeHTML,
    },
  }
}
