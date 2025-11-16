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
} from "../util/path"
import { JSResource, CSSResource } from "../util/resources"
import { escapeHTML } from "../util/escape"

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
    split: (slug: FullSlug) => [FullSlug, string]
    join: (...segments: string[]) => FilePath
  }

  // Resource management
  resources: {
    createExternalJS: (src: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => JSResource
    createInlineJS: (script: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => JSResource
    createCSS: (resource: CSSResource) => CSSResource
  }

  // Other utilities as needed
  escape: {
    html: (text: string) => string
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
      split: (slug: FullSlug) => {
        const [path, anchor] = splitAnchor(slug)
        return [path as FullSlug, anchor]
      },
      join: (...segments: string[]) => joinSegments(...segments) as FilePath,
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
    },
  }
}
