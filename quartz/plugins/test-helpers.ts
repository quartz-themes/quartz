import { VFile } from "vfile"
import { QuartzVFileData } from "./vfile-schema"
import { FullSlug, FilePath, SimpleSlug, RelativeURL, TransformOptions } from "../util/path"
import { QuartzConfig } from "../cfg"
import { Argv } from "../util/ctx"
import { CSSResource } from "../util/resources"
import { PluginContext, PluginUtilities } from "./plugin-context"

/**
 * Create a mock plugin context for testing
 */
export function createMockPluginContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    cfg: createMockConfig(),
    buildId: "test-build",
    argv: createMockArgv(),
    allSlugs: [],
    allFiles: [],
    incremental: false,
    utils: createMockUtilities(),
    trie: undefined,
    ...overrides,
  } as PluginContext
}

/**
 * Create a mock VFile for testing
 */
export function createMockVFile(data?: Partial<QuartzVFileData>): VFile {
  const file = new VFile("")
  file.data = {
    slug: "test" as FullSlug,
    filePath: "test.md" as FilePath,
    relativePath: "test.md" as FilePath,
    ...data,
  } as Partial<QuartzVFileData>
  return file
}

function createMockConfig(): QuartzConfig {
  return {
    configuration: {
      pageTitle: "Test Site",
      baseUrl: "test.com",
      locale: "en-US",
      enableSPA: true,
      enablePopovers: true,
      analytics: null,
      ignorePatterns: [],
      defaultDateType: "created",
      theme: {
        typography: {
          header: "Schibsted Grotesk",
          body: "Source Sans Pro",
          code: "IBM Plex Mono",
        },
        colors: {
          lightMode: {
            light: "#faf8f8",
            lightgray: "#e5e5e5",
            gray: "#b8b8b8",
            darkgray: "#4e4e4e",
            dark: "#2b2b2b",
            secondary: "#284b63",
            tertiary: "#84a59d",
            highlight: "rgba(143, 159, 169, 0.15)",
            textHighlight: "#fff23688",
          },
          darkMode: {
            light: "#161618",
            lightgray: "#393639",
            gray: "#646464",
            darkgray: "#d4d4d4",
            dark: "#ebebec",
            secondary: "#7b97aa",
            tertiary: "#84a59d",
            highlight: "rgba(143, 159, 169, 0.15)",
            textHighlight: "#b3aa0288",
          },
        },
        fontOrigin: "googleFonts",
        cdnCaching: true,
      },
    },
    plugins: {
      transformers: [],
      filters: [],
      emitters: [],
    },
  } as QuartzConfig
}

function createMockArgv(): Argv {
  return {
    directory: "content",
    verbose: false,
    output: "public",
    serve: false,
    watch: false,
    port: 8080,
    wsPort: 3001,
  }
}

function createMockUtilities(): PluginUtilities {
  return {
    path: {
      slugify: (path: FilePath) => path as unknown as FullSlug,
      simplify: (slug: FullSlug) => slug as unknown as SimpleSlug,
      transform: (_from: FullSlug, to: string, _opts: TransformOptions) => to as RelativeURL,
      toRoot: (_slug: FullSlug) => "/" as RelativeURL,
      split: (slug: string) => {
        // Mock implementation of splitAnchor with special PDF handling
        let [fp, anchor] = slug.split("#", 2)
        if (fp.endsWith(".pdf")) {
          return [fp, anchor === undefined ? "" : `#${anchor}`]
        }
        // Simplified anchor sluggification (production uses github-slugger)
        anchor = anchor === undefined ? "" : "#" + anchor.toLowerCase().replace(/\s+/g, "-")
        return [fp, anchor]
      },
      join: (...segments: string[]) => segments.join("/"),
      getAllSegmentPrefixes: (tags: string) => {
        const segments = tags.split("/")
        const results: string[] = []
        for (let i = 0; i < segments.length; i++) {
          results.push(segments.slice(0, i + 1).join("/"))
        }
        return results
      },
      getFileExtension: (s: string) => s.match(/\.[A-Za-z0-9]+$/)?.[0],
      isAbsoluteURL: (s: string) => {
        try {
          new URL(s)
          return true
        } catch {
          return false
        }
      },
      isRelativeURL: (s: string) => {
        // 1. Starts with '.' or '..'
        if (!/^\.{1,2}/.test(s)) return false
        // 2. Does not end with 'index'
        if (s.endsWith("index")) return false
        // 3. File extension is not .md or .html
        const ext = s.match(/\.[A-Za-z0-9]+$/)?.[0]?.toLowerCase()
        if (ext === ".md" || ext === ".html") return false
        return true
      },
      resolveRelative: (_current: FullSlug, target: FullSlug | SimpleSlug) =>
        target as unknown as RelativeURL,
      slugTag: (tag: string) => {
        // Mock sluggify function similar to production
        const sluggify = (segment: string) =>
          segment
            .toLowerCase()
            .replace(/[&%?#]/g, "") // remove special chars
            .replace(/\s+/g, "-") // replace spaces with dashes
            .replace(/-+/g, "-") // collapse multiple dashes
            .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
        return tag.split("/").map(sluggify).join("/")
      },
      stripSlashes: (s: string, onlyStripPrefix?: boolean) => {
        if (s.startsWith("/")) {
          s = s.substring(1)
        }
        if (!onlyStripPrefix && s.endsWith("/")) {
          s = s.slice(0, -1)
        }
        return s
      },
      QUARTZ: "quartz",
    },
    resources: {
      createExternalJS: (src: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => ({
        src,
        contentType: "external" as const,
        loadTime: loadTime ?? "afterDOMReady",
      }),
      createInlineJS: (script: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => ({
        script,
        contentType: "inline" as const,
        loadTime: loadTime ?? "afterDOMReady",
      }),
      createCSS: (resource: CSSResource) => resource,
    },
    escape: {
      html: (text: string) => text.replace(/[&<>"']/g, (m) => `&#${m.charCodeAt(0)};`),
      // Note: This mock implementation mirrors the production code in util/escape.ts
      // which has a known limitation of potential double-unescaping.
      // This is acceptable as it matches the real implementation for testing purposes.
      unescape: (html: string) =>
        html
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'"),
    },
  }
}
