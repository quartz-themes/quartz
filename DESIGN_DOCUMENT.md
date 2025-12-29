# Quartz v5: Static, Plugin-First Architecture

## Summary

Quartz v5 is a purely static, plugin-first evolution of the current v4 architecture that:

- **Elevates plugins to first-class, versioned, swappable building blocks** - extends the current transformer/filter/emitter plugin system with explicit versioning, capability negotiation, and a plugin registry
- **Generalizes the build pipeline** - enhances the existing unified/remark/rehype pipeline with a static DAG scheduler, better caching, and deterministic builds
- **Decouples rendering** - evolves the current Preact-based component system with enhanced layout composition and resource injection
- **Adds multi-type inputs** - extends beyond Markdown to support Obsidian Canvas, databases, and other formats through pluggable loaders
- **Introduces a formalized Resource API** - builds on the current StaticResources system for deterministic static asset management (CSS/JS/fonts/wasm)
- **Supports incremental builds** - enhances the current file watching system with a lockfile, partial emits, and content-addressed caching
- **Provides typed config and ergonomic CLI** - improves the existing configuration with stronger typing, validation, and plugin management commands
- **Maintains backward compatibility** - ensures v4 sites can migrate smoothly through a "Legacy preset" and migration tooling

## Goals and Non-Goals

### Goals
- Stable, versioned plugin API surfaces building on the current QuartzTransformerPlugin, QuartzFilterPlugin, and QuartzEmitterPlugin interfaces
- Pluggable loaders/transformers/filters/emitters/layouts/themes extending the existing plugin architecture
- Static-only output with optional client-side progressive enhancement (maintaining current SPA routing and component hydration)
- Deterministic builds with lockfile and reproducible plugin resolution
- Incremental builds with partial emits (enhancing the current file watching and rebuild system)
- Strong typing and runtime validation for configs/options (building on the current QuartzConfig interface)
- Simple installation/upgrades for plugins via CLI (extending the current `npx quartz` commands)
- Backward compatibility for current Quartz v4 sites

### Non-Goals
- No server-side rendering at request time (maintaining the current static generation approach)
- No runtime servers for published sites (preserving the current static hosting model)
- No full Obsidian feature parity in v1; begin with a pragmatic subset

---

## Current v4 Architecture Overview

Quartz v4 uses a three-phase build pipeline:

1. **Parse Phase** (`quartz/processors/parse.ts`)
   - Reads Markdown files using vfile
   - Applies text transformations via transformer plugins
   - Converts Markdown → mdast (Markdown AST) via remark-parse
   - Applies mdast → mdast transformations via transformer plugin `markdownPlugins()`
   - Converts mdast → hast (HTML AST) via remark-rehype
   - Applies hast → hast transformations via transformer plugin `htmlPlugins()`
   - Uses workerpool for parallel processing (>128 files)

2. **Filter Phase** (`quartz/processors/filter.ts`)
   - Filters content using QuartzFilterPlugin instances
   - Each filter implements `shouldPublish(ctx, content)` method

3. **Emit Phase** (`quartz/processors/emit.ts`)
   - Gathers static resources from all plugins via `externalResources()`
   - Each emitter emits files via `emit(ctx, content, resources)`
   - Supports partial emits via optional `partialEmit()` for incremental builds
   - Uses Preact components to render HTML via `preact-render-to-string`

### Current Plugin System

**Transformers** (`QuartzTransformerPluginInstance`):
- `textTransform?`: string → string transformations
- `markdownPlugins?`: returns unified plugins for mdast processing
- `htmlPlugins?`: returns unified plugins for hast processing
- `externalResources?`: contributes CSS/JS resources

**Filters** (`QuartzFilterPluginInstance`):
- `shouldPublish()`: determines if content should be published

**Emitters** (`QuartzEmitterPluginInstance`):
- `emit()`: generates output files from processed content
- `partialEmit?()`: optional incremental rebuild support
- `getQuartzComponents?()`: returns components used for resource optimization
- `externalResources?`: contributes CSS/JS resources

### Current Component System

Components are Preact components with static resource declarations:

```typescript
export type QuartzComponent = ComponentType<QuartzComponentProps> & {
  css?: StringResource           // CSS files/inline styles
  beforeDOMLoaded?: StringResource  // Scripts to run before DOM ready
  afterDOMLoaded?: StringResource   // Scripts to run after DOM ready
}
```

Layouts are assembled from components defined in `quartz.layout.ts`:
- `SharedLayout`: head, header, footer, afterBody (shared across all pages)
- `PageLayout`: beforeBody, left, right (page-specific sections)
- `FullPageLayout`: combines SharedLayout + PageLayout + pageBody

The rendering pipeline (`quartz/components/renderPage.tsx`):
1. Gathers component resources (CSS/JS) from all components in use
2. Converts hast → JSX via hast-util-to-jsx-runtime
3. Assembles the full page with components in layout slots
4. Renders to static HTML via preact-render-to-string
5. Processes CSS via Lightning CSS for minification and vendor prefixes
6. Bundles JS via esbuild (inline scripts in `*.inline.ts` files)

### Current Resource Management

Resources are managed through `StaticResources`:

```typescript
export interface StaticResources {
  css: CSSResource[]              // Stylesheets (inline or linked)
  js: JSResource[]                // Scripts (inline or external)
  additionalHead: JSX.Element[]   // Additional head elements
}
```

- CSS can be inline or linked, with SPA preservation
- JS has loadTime (beforeDOMReady/afterDOMReady) and moduleType
- Resources from plugins/components are gathered and deduplicated
- esbuild bundles client scripts with sass-plugin for SCSS
- Lightning CSS processes and minifies stylesheets

### Current Build System

The build process (`quartz/build.ts`):

1. Clean output directory
2. Glob all files in content directory (respecting `.gitignore` and `ignorePatterns`)
3. Parse Markdown files (parallel processing via workerpool)
4. Filter content via filter plugins
5. Emit content via emitter plugins
6. Watch mode: file watcher with debounced rebuilds (250ms)
7. Incremental rebuilds: track content map, partial emits

CLI (`quartz/bootstrap-cli.mjs`):
- Commands: create, update, restore, sync, build
- Uses esbuild to transpile TypeScript on-the-fly
- Bundles with cache busting for hot reload
- Starts WebSocket server for live reload (port 3001)
- Starts HTTP server for preview (default port 8080)
- File watchers for both source and content changes

---

## v5 Architecture Evolution

### Enhanced Plugin System

**Plugin Versioning and Capabilities**

```typescript
export interface PluginManifest {
  name: string
  version: string                    // semver
  apiVersion: string                 // Quartz plugin API version (e.g., "5.0")
  capabilities?: string[]            // Optional capabilities (e.g., "incremental", "streaming")
  dependencies?: Record<string, string> // Plugin dependencies with version constraints
}

export type QuartzTransformerPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzTransformerPluginInstance & PluginManifest

export type QuartzFilterPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzFilterPluginInstance & PluginManifest

export type QuartzEmitterPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzEmitterPluginInstance & PluginManifest
```

**New Plugin Type: Loaders**

Loaders handle non-Markdown input formats:

```typescript
export interface QuartzLoaderPluginInstance extends PluginManifest {
  name: string
  supportedExtensions: string[]      // e.g., [".canvas", ".md", ".mdx"]
  
  // Load file and convert to intermediate representation
  load: (ctx: BuildCtx, file: VFile) => Promise<LoadedContent>
  
  // Optional: extract links for graph building
  extractLinks?: (ctx: BuildCtx, content: LoadedContent) => Link[]
  
  // Optional: contribute resources
  externalResources?: ExternalResourcesFn
}

export type LoadedContent = {
  kind: ContentKind
  data: unknown  // Loader-specific data structure
  frontmatter?: Frontmatter
  slug?: FullSlug
}

export type ContentKind = 
  | "markdown"      // Standard Markdown → mdast pipeline
  | "canvas"        // Obsidian Canvas → custom AST
  | "database"      // Obsidian Database → structured data
  | "asset"         // Images, PDFs, etc.
  | "custom"        // Plugin-defined content types
```

**Enhanced Configuration with Loaders**

```typescript
export interface PluginTypes {
  loaders: QuartzLoaderPluginInstance[]      // NEW: content loaders
  transformers: QuartzTransformerPluginInstance[]
  filters: QuartzFilterPluginInstance[]
  emitters: QuartzEmitterPluginInstance[]
}
```

### Enhanced Data Model

**Extended ProcessedContent**

```typescript
export interface PageMeta {
  id: PageId                         // Unique content-addressable ID
  slug: FullSlug                     // URL slug
  filePath: FilePath                 // Source-relative path
  outPath: string                    // Output-relative path (e.g., foo/index.html)
  title?: string                     // Page title
  tags: string[]                     // Tags
  created?: Date                     // Creation date
  updated?: Date                     // Last modified date
  draft?: boolean                    // Draft status
  publish?: boolean                  // Publish status
  contentKind: ContentKind           // Content type
  layoutId?: string                  // Selected layout
}

export interface Links {
  outgoing: Array<{
    target: PageId | FullSlug
    type: LinkType                   // "wiki", "markdown", "url", etc.
    text?: string                    // Link text
    meta?: unknown                   // Link-specific metadata
  }>
  incoming: Array<{
    source: PageId | FullSlug
    type: LinkType
    text?: string
    meta?: unknown
  }>
}

export interface ProcessedContentV5 {
  meta: PageMeta
  frontmatter: Frontmatter
  
  // AST representations (populated based on contentKind)
  mdast?: MdRoot                     // For markdown content
  hast?: HtmlRoot                    // For markdown content
  canvasAst?: CanvasNode             // For canvas content
  databaseAst?: DatabaseNode         // For database content
  
  html?: string                      // Rendered HTML (content slot)
  links: Links                       // Link graph
  assets?: EmittedAssetRef[]         // Associated assets
  data?: Record<string, unknown>     // Plugin-specific data
  
  // v4 compatibility
  vfile: VFile                       // Original vfile for compatibility
}
```

**EmittedAssetRef**

```typescript
export interface EmittedAssetRef {
  id: string                         // Unique asset ID
  relPath: string                    // Output-relative path
  type: AssetType
  integrity?: string                 // SRI hash
  size?: number                      // File size in bytes
  hash?: string                      // Content hash for cache busting
}

export type AssetType = "css" | "js" | "font" | "image" | "wasm" | "other"
```

### Enhanced Resource API

Building on the current `StaticResources` system:

```typescript
export interface ResourceRegistry {
  // Register resources (replaces direct array manipulation)
  registerCSS(resource: CSSResource): void
  registerJS(resource: JSResource): void
  registerAsset(asset: EmittedAssetRef): void
  registerHeadElement(element: JSX.Element | ((data: QuartzPluginData) => JSX.Element)): void
  
  // Query resources
  getCSS(): CSSResource[]
  getJS(): JSResource[]
  getAssets(): EmittedAssetRef[]
  getHeadElements(): (JSX.Element | ((data: QuartzPluginData) => JSX.Element))[]
  
  // Resource deduplication and optimization
  deduplicate(): void
  optimize(): void
}

// Enhanced resource types
export type CSSResource = {
  content: string                    // URL or inline content
  inline?: boolean                   // Inline vs linked
  spaPreserve?: boolean              // Preserve across SPA navigation
  media?: string                     // Media query
  integrity?: string                 // SRI hash
  priority?: "critical" | "normal" | "lazy"  // Load priority
}

export type JSResource = {
  loadTime: "beforeDOMReady" | "afterDOMReady"
  moduleType?: "module" | "nomodule"
  spaPreserve?: boolean
  integrity?: string                 // SRI hash
  priority?: "critical" | "normal" | "lazy"
  defer?: boolean
  async?: boolean
} & (
  | { src: string; contentType: "external" }
  | { script: string; contentType: "inline" }
)
```

**CDN and External Resources**

Following current v4 behavior with explicit control:

```typescript
export interface ResourceOptions {
  // CDN settings (disabled by default, opt-in)
  cdnCaching?: boolean               // Enable CDN for resources
  allowedDomains?: string[]          // Allowlist for external resources
  
  // Google Fonts integration (current v4 behavior)
  googleFonts?: {
    enabled: boolean
    families: string[]               // Font families to load
  }
  
  // Resource optimization
  minify?: boolean                   // Minify CSS/JS
  bundling?: "inline" | "external" | "auto"
  integrity?: boolean                // Generate SRI hashes
}
```

### Enhanced Build Pipeline

**Build DAG and Scheduler**

```typescript
export interface BuildGraph {
  // Build nodes represent work units
  nodes: Map<string, BuildNode>
  
  // Edges represent dependencies
  edges: Map<string, Set<string>>
  
  // Schedule and execute build
  schedule(): Promise<BuildResult>
  
  // Incremental build support
  invalidate(paths: FilePath[]): void
  partialSchedule(): Promise<BuildResult>
}

export interface BuildNode {
  id: string
  type: "load" | "transform" | "filter" | "emit"
  plugin: PluginManifest
  dependencies: string[]
  cached?: boolean
  execute(ctx: BuildCtx): Promise<unknown>
}
```

**Content-Addressed Caching**

```typescript
export interface BuildCache {
  // Cache keys based on content hash + plugin version
  get(key: CacheKey): Promise<CachedEntry | undefined>
  set(key: CacheKey, value: CachedEntry): Promise<void>
  invalidate(key: CacheKey): Promise<void>
  clear(): Promise<void>
}

export type CacheKey = {
  contentHash: string                // Hash of input content
  pluginName: string
  pluginVersion: string
  optionsHash: string                // Hash of plugin options
}

export interface CachedEntry {
  output: unknown                    // Cached output
  timestamp: number
  dependencies: string[]             // Dependency tracking
}
```

**Lockfile**

```typescript
// quartz.lock (JSON format)
export interface Lockfile {
  version: string                    // Lockfile format version
  quartzVersion: string              // Quartz version
  plugins: {
    [name: string]: {
      version: string                // Resolved plugin version
      resolved: string               // Resolution source (npm, git, local)
      integrity?: string             // Package integrity hash
      dependencies?: Record<string, string>
    }
  }
  generated: string                  // ISO timestamp
}
```

### Enhanced Layout and Component System

**Layout Registry**

Layouts are pre-registered (not ad-hoc in frontmatter):

```typescript
export interface LayoutRegistry {
  register(id: string, layout: LayoutDefinition): void
  get(id: string): LayoutDefinition | undefined
  list(): string[]
}

export interface LayoutDefinition {
  id: string
  name: string
  description?: string
  layout: FullPageLayout              // Existing v4 layout structure
}

// In quartz.config.ts or quartz.layout.ts
export const layouts: LayoutRegistry = {
  "default": {
    id: "default",
    name: "Default Layout",
    layout: {
      head: Component.Head(),
      header: [],
      beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle()],
      pageBody: Component.Content(),
      afterBody: [],
      left: [Component.PageTitle(), Component.Explorer()],
      right: [Component.Graph(), Component.TableOfContents()],
      footer: Component.Footer(),
    }
  },
  "minimal": {
    id: "minimal",
    name: "Minimal Layout",
    layout: { /* ... */ }
  }
}

// In frontmatter:
// ---
// layout: "minimal"
// ---
```

**Component Slots and Injection**

Core owns the HTML document wrapper; themes/plugins inject via slots:

```typescript
export interface DocumentSlots {
  htmlAttrs?: Record<string, string>  // <html> attributes
  headStart?: JSX.Element[]           // After <head> opening
  headEnd?: JSX.Element[]             // Before </head> closing
  bodyAttrs?: Record<string, string>  // <body> attributes
  bodyStart?: JSX.Element[]           // After <body> opening
  bodyEnd?: JSX.Element[]             // Before </body> closing
}

export interface ThemePlugin {
  name: string
  version: string
  
  // Inject into document slots
  injectSlots?: (ctx: BuildCtx) => Partial<DocumentSlots>
  
  // Contribute resources
  externalResources?: ExternalResourcesFn
  
  // Override component defaults
  overrideComponents?: Partial<Record<string, QuartzComponent>>
}
```

### Enhanced CLI

**New Commands**

```bash
# Existing commands (preserved)
npx quartz create
npx quartz build
npx quartz update
npx quartz sync
npx quartz restore

# New plugin management commands
npx quartz plugin add <plugin-name>[@version]
npx quartz plugin remove <plugin-name>
npx quartz plugin list
npx quartz plugin update [plugin-name]
npx quartz plugin search <query>

# New lockfile commands
npx quartz lock
npx quartz lock verify

# Enhanced build with cache control
npx quartz build --no-cache
npx quartz build --cache-stats
npx quartz build --dry-run

# New migration command
npx quartz migrate v4-to-v5
```

**Plugin Installation**

```typescript
// Plugins can be installed from:
// 1. npm registry: npx quartz plugin add @quartz/plugin-canvas
// 2. git repository: npx quartz plugin add github:user/repo
// 3. local path: npx quartz plugin add ./local-plugins/my-plugin

// Installed plugins are added to quartz.config.ts and quartz.lock
```

### Incremental Build Enhancements

Building on the current file watching system:

**Enhanced Change Tracking**

```typescript
export interface ChangeTracker {
  // Track changes since last build
  track(event: ChangeEvent): void
  
  // Get affected content based on dependency graph
  getAffectedContent(changes: ChangeEvent[]): Set<PageId>
  
  // Clear after successful build
  clear(): void
}

export interface DependencyGraph {
  // Build dependency graph from links and plugin dependencies
  build(content: ProcessedContentV5[]): void
  
  // Find all content that depends on a given file
  getDependents(id: PageId): Set<PageId>
  
  // Update graph incrementally
  updateNode(id: PageId, content: ProcessedContentV5): void
  removeNode(id: PageId): void
}
```

**Partial Emits (Enhanced)**

All emitters should support partial emits:

```typescript
export interface QuartzEmitterPluginInstance extends PluginManifest {
  name: string
  emit: (ctx: BuildCtx, content: ProcessedContentV5[], resources: StaticResources) 
    => Promise<FilePath[]> | AsyncGenerator<FilePath>
  
  // Enhanced partial emit with dependency awareness
  partialEmit?: (
    ctx: BuildCtx,
    content: ProcessedContentV5[],        // All content
    resources: StaticResources,
    changes: ChangeInfo,                  // Enhanced change info
  ) => Promise<FilePath[]> | AsyncGenerator<FilePath> | null
  
  getQuartzComponents?: (ctx: BuildCtx) => QuartzComponent[]
  externalResources?: ExternalResourcesFn
}

export interface ChangeInfo {
  events: ChangeEvent[]                   // Raw change events
  affected: Set<PageId>                   // Content IDs affected by changes
  direct: Set<PageId>                     // Directly changed content
  indirect: Set<PageId>                   // Indirectly affected (via dependencies)
}
```

### Typed Configuration

**Enhanced quartz.config.ts**

```typescript
import { defineConfig } from './quartz/config'

export default defineConfig({
  configuration: {
    pageTitle: "My Digital Garden",
    enableSPA: true,
    enablePopovers: true,
    locale: "en-US",
    baseUrl: "example.com",
    ignorePatterns: ["private/**", "drafts/**"],
    defaultDateType: "modified",
    
    // New: Resource options
    resources: {
      cdnCaching: false,               // Explicit opt-in
      allowedDomains: [
        "fonts.googleapis.com",
        "fonts.gstatic.com",
      ],
      googleFonts: {
        enabled: true,
        families: ["Inter", "JetBrains Mono"],
      },
      minify: true,
      integrity: true,
    },
    
    theme: {
      fontOrigin: "googleFonts",
      typography: { /* ... */ },
      colors: { /* ... */ },
    },
  },
  
  plugins: {
    loaders: [
      Plugin.MarkdownLoader(),         // Default Markdown loader
      Plugin.CanvasLoader(),           // NEW: Obsidian Canvas support
      Plugin.AssetLoader(),            // NEW: Asset handling
    ],
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate(),
      Plugin.SyntaxHighlighting(),
      Plugin.ObsidianFlavoredMarkdown(),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks(),
      Plugin.Description(),
      Plugin.Latex(),
    ],
    filters: [
      Plugin.RemoveDrafts(),
    ],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex(),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
  
  // New: Layout registry
  layouts: {
    default: defaultLayout,
    minimal: minimalLayout,
    blog: blogLayout,
  },
})

// Runtime validation helper
export function defineConfig(config: QuartzConfig): QuartzConfig {
  // Validate configuration
  validateConfig(config)
  return config
}
```

### Multi-Format Support

**Markdown (Existing)**

Current v4 behavior maintained with enhanced metadata:

```typescript
export const MarkdownLoader: QuartzLoaderPlugin = () => ({
  name: "MarkdownLoader",
  version: "5.0.0",
  apiVersion: "5.0",
  supportedExtensions: [".md", ".markdown"],
  
  async load(ctx, file) {
    // Existing v4 pipeline
    const text = await file.toString()
    return {
      kind: "markdown",
      data: text,
      frontmatter: extractFrontmatter(text),
      slug: slugifyFilePath(file.path),
    }
  },
  
  extractLinks(ctx, content) {
    // Leverage existing CrawlLinks plugin
    return extractMarkdownLinks(content.data)
  },
})
```

**Obsidian Canvas (New)**

```typescript
export const CanvasLoader: QuartzLoaderPlugin = () => ({
  name: "CanvasLoader",
  version: "5.0.0",
  apiVersion: "5.0",
  supportedExtensions: [".canvas"],
  
  async load(ctx, file) {
    const json = JSON.parse(await file.toString())
    const ast = parseCanvasJSON(json)
    
    return {
      kind: "canvas",
      data: ast,
      frontmatter: {
        title: path.basename(file.path, ".canvas"),
      },
      slug: slugifyFilePath(file.path),
    }
  },
  
  extractLinks(ctx, content) {
    const ast = content.data as CanvasNode
    return extractCanvasLinks(ast)
  },
})
```

**Asset Handling (Enhanced)**

```typescript
export const AssetLoader: QuartzLoaderPlugin = () => ({
  name: "AssetLoader",
  version: "5.0.0",
  apiVersion: "5.0",
  supportedExtensions: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".pdf", ".mp4"],
  
  async load(ctx, file) {
    return {
      kind: "asset",
      data: {
        path: file.path,
        size: file.size,
        mimeType: getMimeType(file.path),
      },
      slug: slugifyFilePath(file.path),
    }
  },
})
```

---

## Backward Compatibility Strategy

### Legacy Preset

Provides a compatibility layer for v4 sites:

```typescript
export const LegacyPreset: QuartzPlugin = () => ({
  name: "LegacyPreset",
  version: "5.0.0",
  
  // Maps v4 plugin signatures to v5
  wrapV4Plugins(plugins: PluginTypes): PluginTypes {
    return {
      loaders: [MarkdownLoader()],     // Default loader for v4 compat
      transformers: plugins.transformers.map(wrapV4Transformer),
      filters: plugins.filters.map(wrapV4Filter),
      emitters: plugins.emitters.map(wrapV4Emitter),
    }
  },
})
```

### Migration Tooling

```bash
# Automated migration from v4 to v5
npx quartz migrate v4-to-v5

# Steps performed:
# 1. Analyze existing quartz.config.ts
# 2. Create quartz.lock based on current plugins
# 3. Update plugin imports to v5 format (if available)
# 4. Add legacy preset for plugins without v5 versions
# 5. Update quartz.layout.ts to use layout registry
# 6. Create backup of original files
# 7. Generate migration report
```

### Gradual Migration Path

Users can migrate incrementally:

1. **Phase 1**: Use legacy preset, v4 config works as-is
2. **Phase 2**: Migrate individual plugins to v5 as they become available
3. **Phase 3**: Adopt new v5 features (loaders, enhanced resources, etc.)
4. **Phase 4**: Remove legacy preset once all plugins are v5-native

---

## Implementation Roadmap

### Phase 1: Foundation (v5.0-alpha)
- [ ] Plugin versioning and manifest system
- [ ] Lockfile generation and management
- [ ] Enhanced typed configuration with validation
- [ ] Legacy preset for v4 compatibility
- [ ] Migration tooling

### Phase 2: Enhanced Build Pipeline (v5.0-beta)
- [ ] Loader plugin type and registration
- [ ] Enhanced data model (PageMeta, Links, ProcessedContentV5)
- [ ] Content-addressed caching system
- [ ] Build DAG and scheduler
- [ ] Enhanced dependency tracking

### Phase 3: Resource Management (v5.0-rc)
- [ ] Resource registry API
- [ ] Enhanced CSS/JS resource types
- [ ] SRI hash generation
- [ ] Resource optimization and bundling
- [ ] Layout registry system

### Phase 4: Multi-Format Support (v5.0)
- [ ] Markdown loader (v4 compat mode)
- [ ] Obsidian Canvas loader
- [ ] Enhanced asset loader
- [ ] Link extraction for all formats
- [ ] Graph building across formats

### Phase 5: Enhanced Developer Experience (v5.1)
- [ ] Plugin CLI commands (add, remove, list, search)
- [ ] Enhanced incremental builds
- [ ] Build cache statistics
- [ ] Performance profiling tools
- [ ] Plugin development templates

### Phase 6: Advanced Features (v5.2+)
- [ ] Obsidian Database support
- [ ] Streaming emitters for large sites
- [ ] Distributed builds
- [ ] Plugin marketplace
- [ ] Visual plugin configuration UI

---

## Success Criteria

v5 is successful if:

1. **Backward Compatibility**: All v4 sites can migrate with zero breaking changes using the legacy preset
2. **Performance**: Build times improve by at least 30% for incremental builds
3. **Extensibility**: Community can publish and share versioned plugins via npm
4. **Type Safety**: 90%+ of configuration errors caught by TypeScript compiler
5. **Documentation**: Complete migration guide and plugin development guide
6. **Adoption**: 80%+ of v4 plugins ported to v5 within 6 months of release

---

## Appendix: Core Type Definitions

### Existing v4 Types (Maintained)

```typescript
// From quartz/plugins/vfile.ts
export type QuartzPluginData = Data
export type MarkdownContent = [MdRoot, VFile]
export type ProcessedContent = [HtmlRoot, VFile]

// From quartz/plugins/types.ts
export interface PluginTypes {
  transformers: QuartzTransformerPluginInstance[]
  filters: QuartzFilterPluginInstance[]
  emitters: QuartzEmitterPluginInstance[]
}

export type QuartzTransformerPluginInstance = {
  name: string
  textTransform?: (ctx: BuildCtx, src: string) => string
  markdownPlugins?: (ctx: BuildCtx) => PluggableList
  htmlPlugins?: (ctx: BuildCtx) => PluggableList
  externalResources?: ExternalResourcesFn
}

export type QuartzFilterPluginInstance = {
  name: string
  shouldPublish(ctx: BuildCtx, content: ProcessedContent): boolean
}

export type QuartzEmitterPluginInstance = {
  name: string
  emit: (ctx: BuildCtx, content: ProcessedContent[], resources: StaticResources) 
    => Promise<FilePath[]> | AsyncGenerator<FilePath>
  partialEmit?: (ctx: BuildCtx, content: ProcessedContent[], resources: StaticResources, 
    changeEvents: ChangeEvent[]) => Promise<FilePath[]> | AsyncGenerator<FilePath> | null
  getQuartzComponents?: (ctx: BuildCtx) => QuartzComponent[]
  externalResources?: ExternalResourcesFn
}

// From quartz/util/resources.tsx
export interface StaticResources {
  css: CSSResource[]
  js: JSResource[]
  additionalHead: (JSX.Element | ((pageData: QuartzPluginData) => JSX.Element))[]
}

export type CSSResource = {
  content: string
  inline?: boolean
  spaPreserve?: boolean
}

export type JSResource = {
  loadTime: "beforeDOMReady" | "afterDOMReady"
  moduleType?: "module"
  spaPreserve?: boolean
} & (
  | { src: string; contentType: "external" }
  | { script: string; contentType: "inline" }
)

// From quartz/cfg.ts
export interface QuartzConfig {
  configuration: GlobalConfiguration
  plugins: PluginTypes
}

export interface FullPageLayout {
  head: QuartzComponent
  header: QuartzComponent[]
  beforeBody: QuartzComponent[]
  pageBody: QuartzComponent
  afterBody: QuartzComponent[]
  left: QuartzComponent[]
  right: QuartzComponent[]
  footer: QuartzComponent
}

// From quartz/components/types.ts
export type QuartzComponent = ComponentType<QuartzComponentProps> & {
  css?: StringResource
  beforeDOMLoaded?: StringResource
  afterDOMLoaded?: StringResource
}
```

### New v5 Types

```typescript
// Loader plugin (NEW)
export interface QuartzLoaderPluginInstance extends PluginManifest {
  name: string
  supportedExtensions: string[]
  load: (ctx: BuildCtx, file: VFile) => Promise<LoadedContent>
  extractLinks?: (ctx: BuildCtx, content: LoadedContent) => Link[]
  externalResources?: ExternalResourcesFn
}

// Enhanced content model (NEW)
export interface ProcessedContentV5 {
  meta: PageMeta
  frontmatter: Frontmatter
  mdast?: MdRoot
  hast?: HtmlRoot
  canvasAst?: CanvasNode
  databaseAst?: DatabaseNode
  html?: string
  links: Links
  assets?: EmittedAssetRef[]
  data?: Record<string, unknown>
  vfile: VFile  // v4 compatibility
}

// Plugin manifest (NEW)
export interface PluginManifest {
  name: string
  version: string
  apiVersion: string
  capabilities?: string[]
  dependencies?: Record<string, string>
}

// Resource registry (NEW)
export interface ResourceRegistry {
  registerCSS(resource: CSSResource): void
  registerJS(resource: JSResource): void
  registerAsset(asset: EmittedAssetRef): void
  registerHeadElement(element: JSX.Element | ((data: QuartzPluginData) => JSX.Element)): void
  getCSS(): CSSResource[]
  getJS(): JSResource[]
  getAssets(): EmittedAssetRef[]
  getHeadElements(): (JSX.Element | ((data: QuartzPluginData) => JSX.Element))[]
  deduplicate(): void
  optimize(): void
}
```

---

## Philosophy Alignment

This design maintains Quartz's core philosophy:

1. **A garden should be a true hypertext**: The enhanced link graph and multi-format support (Canvas, etc.) embrace the rhizomatic nature of thought even more deeply.

2. **A garden should be shared**: The static-only output with enhanced performance and incremental builds makes sharing faster and easier.

3. **A garden should be your own**: The enhanced plugin system and layout registry provide even more customization while maintaining intuitive defaults. The three-tier approach (content-only, config-tweaking, source-editing) is preserved and enhanced.

The v5 evolution builds incrementally on v4's solid foundation, maintaining backward compatibility while opening new possibilities for extension and customization.
