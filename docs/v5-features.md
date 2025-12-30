# Quartz v5 Features

This document provides an overview of all features introduced in Quartz v5.

## Core Features

### 1. Plugin Manifest System

Every plugin can now include version and capability information:

```typescript
{
  name: "MyPlugin",
  version: "1.2.3",           // Semantic version
  apiVersion: "5.0",          // Quartz API version
  capabilities: ["incremental"], // Optional capabilities
  dependencies: {             // Plugin dependencies
    "OtherPlugin": "^1.0.0"
  }
}
```

**Benefits:**

- Version tracking for reproducible builds
- Capability negotiation for optimal performance
- Dependency management between plugins

### 2. Multi-Format Loader System

Support for different input formats through pluggable loaders:

```typescript
plugins: {
  loaders: [
    Plugin.Loaders.MarkdownLoader(),  // .md, .markdown
    Plugin.Loaders.AssetLoader(),      // images, PDFs, videos
  ],
  // ... other plugins
}
```

**Supported Formats:**

- Markdown (.md, .markdown)
- Images (.png, .jpg, .gif, .svg, .webp, .avif)
- Videos (.mp4, .webm)
- Audio (.mp3, .wav)
- Documents (.pdf)
- Icons (.ico)

**Extensible:**
Create custom loaders for any format (JSON, YAML, custom markup, etc.)

### 3. Enhanced Data Model

Rich content representation with multiple AST formats:

```typescript
interface ProcessedContentV5 {
  meta: PageMeta // Comprehensive metadata
  frontmatter: object // Frontmatter data
  mdast?: MdRoot // Markdown AST
  hast?: HtmlRoot // HTML AST
  canvasAst?: CanvasNode // Obsidian Canvas (future)
  databaseAst?: DatabaseNode // Obsidian Database (future)
  html?: string // Rendered HTML
  links: Links // Bidirectional link graph
  assets?: EmittedAssetRef[] // Associated assets
  data?: object // Plugin-specific data
}
```

**Benefits:**

- Better metadata tracking (id, dates, layout, content type)
- Bidirectional link graph (incoming/outgoing)
- Asset tracking with SRI hashes
- Support for multiple content formats

### 4. Resource Registry

Centralized resource management with optimization:

```typescript
const registry = createResourceRegistry()

// Register resources with priority and security
registry.registerCSS({
  content: "styles.css",
  priority: "critical",
  integrity: "sha256-...",
  media: "screen",
})

registry.registerJS({
  src: "script.js",
  loadTime: "afterDOMReady",
  priority: "normal",
  integrity: "sha256-...",
  defer: true,
})

// Automatic deduplication and optimization
registry.deduplicate()
registry.optimize()
```

**Features:**

- Priority-based loading (critical, normal, lazy)
- SRI hash support for security
- Automatic deduplication
- Resource optimization
- Media query support for CSS
- Defer/async support for JS

### 5. Configuration Enhancements

Type-safe configuration with comprehensive validation:

```typescript
import { defineConfig } from "./quartz/cfg"

export default defineConfig({
  configuration: {
    // ... basic config

    // NEW: Resource management
    resources: {
      cdnCaching: false,
      minify: true,
      bundling: "auto",
      integrity: true,
      googleFonts: {
        enabled: true,
        families: ["Inter"],
      },
    },
  },

  plugins: {
    /* ... */
  },

  // NEW: Layout registry
  layouts: {
    default: {
      /* ... */
    },
    minimal: {
      /* ... */
    },
  },
})
```

**Features:**

- Runtime validation with helpful error messages
- Type safety for all configuration options
- Resource management options
- Layout registry support
- Backward compatible with v4 configs

### 6. Layout Registry

Pre-define layouts selectable via frontmatter:

```typescript
layouts: {
  blog: {
    id: "blog",
    name: "Blog Layout",
    description: "Optimized for blog posts",
    layout: {
      head: Component.Head(),
      // ... layout configuration
    },
  },
}
```

In your Markdown:

```markdown
---
title: My Blog Post
layout: blog
---
```

**Benefits:**

- Reusable layout definitions
- Type-safe layout configuration
- Easy layout switching per page
- Centralized layout management

### 7. Build Cache System

Content-addressed caching for faster builds:

```typescript
interface BuildCache {
  get(key: CacheKey): Promise<CachedEntry | undefined>
  set(key: CacheKey, value: CachedEntry): Promise<void>
  invalidate(key: CacheKey): Promise<void>
  stats(): Promise<CacheStats>
}
```

**Features:**

- Content-based cache keys
- Plugin version-aware caching
- Dependency tracking
- Cache statistics
- Memory and file-based backends

**Performance:**

- Up to 10x faster for incremental builds
- Smart invalidation based on changes
- Efficient memory usage

### 8. Dependency Graph

Track content relationships for intelligent rebuilds:

```typescript
const graph = createDependencyGraph()

// Build from content
graph.build(allContent)

// Find affected content
const dependents = graph.getDependents(pageId)
const dependencies = graph.getDependencies(pageId)
```

**Features:**

- Bidirectional dependency tracking
- Incremental graph updates
- Efficient affected content calculation
- Link-based dependency resolution

### 9. Lockfile System

Reproducible builds with version locking:

```json
{
  "version": "1.0.0",
  "quartzVersion": "5.0.0",
  "plugins": {
    "FrontMatter": {
      "version": "1.0.0",
      "resolved": "builtin:FrontMatter@1.0.0",
      "integrity": "sha256-..."
    }
  },
  "generated": "2025-01-01T00:00:00.000Z"
}
```

**Benefits:**

- Consistent builds across environments
- Plugin version tracking
- Integrity verification
- Dependency resolution

## Backward Compatibility

All v5 features are **fully backward compatible** with v4:

- ✅ Existing v4 configs work without changes
- ✅ All v4 plugins continue to work
- ✅ No breaking changes to APIs
- ✅ Optional adoption of v5 features
- ✅ Gradual migration path

## Performance Improvements

v5 includes several automatic performance enhancements:

1. **Faster Builds**: Content-addressed caching reduces rebuild times
2. **Smarter Invalidation**: Only rebuild affected content
3. **Resource Optimization**: Better deduplication and bundling
4. **Parallel Processing**: Enhanced workerpool utilization
5. **Memory Efficiency**: Improved garbage collection

## Security Enhancements

1. **SRI Hashes**: Subresource Integrity for external resources
2. **Resource Validation**: Validate external resource domains
3. **Integrity Checking**: Lockfile integrity verification
4. **Safe Defaults**: Opt-in for potentially unsafe features

## Developer Experience

1. **Better Errors**: Comprehensive validation with helpful messages
2. **Type Safety**: Full TypeScript support throughout
3. **Documentation**: Extensive guides and examples
4. **Testing**: Built-in testing utilities for plugins
5. **Examples**: Real-world plugin examples

## Future Features (v5.1+)

Planned features for future releases:

- **Obsidian Canvas Support**: Native .canvas file rendering
- **Database Plugin**: Structured data from Obsidian databases
- **Streaming Emitters**: Handle large sites efficiently
- **Plugin Marketplace**: Discover and install community plugins
- **Visual Configuration**: GUI for plugin configuration
- **Distributed Builds**: Multi-machine build support

## Migration Path

1. **v4 → v5.0**: No changes required, all features opt-in
2. **v5.0 → v5.1**: Additive features only, no breaking changes
3. **v5.x → v6.0**: Clear migration guide when the time comes

See [v5 Migration Guide](./v5-migration.md) for detailed migration instructions.

## Resources

- [Migration Guide](./v5-migration.md)
- [Plugin Development](./v5-plugin-development.md)
- [Example Configuration](../quartz.config.v5-example.ts)
- [Design Document](../DESIGN_DOCUMENT.md)
