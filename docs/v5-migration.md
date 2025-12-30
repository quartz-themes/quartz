# Migrating from Quartz v4 to v5

Quartz v5 is a backward-compatible evolution of v4, introducing enhanced plugin versioning, multi-format support, and improved build performance. This guide will help you migrate your v4 site to take advantage of v5 features.

## Backward Compatibility

**Good news:** Your existing Quartz v4 site will continue to work without any changes! All v5 features are opt-in, and the v4 configuration format is fully supported.

## What's New in v5

### 1. Plugin Versioning and Manifests

Plugins can now declare version information and capabilities:

```typescript
// v4 plugin (still works)
export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  // ... plugin implementation
})

// v5 plugin with manifest
export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  version: "1.0.0",
  apiVersion: "5.0",
  capabilities: ["incremental"],
  // ... plugin implementation
})
```

### 2. Multi-Format Loaders

v5 introduces loaders for handling different content types:

```typescript
// In your quartz.config.ts
import { defineConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

export default defineConfig({
  // ... existing configuration
  plugins: {
    // NEW: Loaders (optional, defaults to Markdown)
    loaders: [
      Plugin.Loaders.MarkdownLoader(), // Markdown support (default)
      Plugin.Loaders.AssetLoader(), // Images, PDFs, etc.
    ],
    transformers: [
      /* ... */
    ],
    filters: [
      /* ... */
    ],
    emitters: [
      /* ... */
    ],
  },
})
```

### 3. Enhanced Configuration with `defineConfig`

The new `defineConfig` helper provides validation and type checking:

```typescript
import { defineConfig } from "./quartz/cfg"

// v4 style (still works)
const config: QuartzConfig = {
  /* ... */
}

// v5 style (recommended)
const config = defineConfig({
  configuration: {
    // ... your configuration
  },
  plugins: {
    // ... your plugins
  },
})

export default config
```

### 4. Resource Management Options

Fine-tune how resources are handled:

```typescript
export default defineConfig({
  configuration: {
    // ... existing config

    // NEW: Resource options
    resources: {
      cdnCaching: false, // Opt-in for CDN
      minify: true, // Minify CSS/JS
      bundling: "auto", // Bundling strategy
      integrity: true, // Generate SRI hashes
      googleFonts: {
        enabled: true,
        families: ["Inter", "Source Sans Pro"],
      },
    },
  },
})
```

### 5. Layout Registry

Pre-define layouts that can be selected in frontmatter:

```typescript
import * as Component from "./quartz/components"

export default defineConfig({
  // ... configuration and plugins

  // NEW: Layout registry
  layouts: {
    default: {
      id: "default",
      name: "Default Layout",
      layout: {
        head: Component.Head(),
        header: [],
        beforeBody: [Component.Breadcrumbs()],
        pageBody: Component.Content(),
        afterBody: [],
        left: [Component.Explorer()],
        right: [Component.TableOfContents()],
        footer: Component.Footer(),
      },
    },
    minimal: {
      id: "minimal",
      name: "Minimal Layout",
      layout: {
        // ... minimal layout configuration
      },
    },
  },
})
```

Then in your Markdown frontmatter:

```markdown
---
title: My Page
layout: minimal
---
```

### 6. Lockfile for Reproducible Builds

v5 introduces a lockfile system for consistent builds:

```bash
# Generate lockfile (automatic on first build)
npx quartz build

# Verify lockfile
npx quartz lock verify
```

The `quartz.lock` file will be created in your project root, tracking plugin versions and dependencies.

## Migration Steps

### Step 1: Update Your Config (Optional)

If you want to use v5 features, update your `quartz.config.ts`:

```typescript
// Add this import
import { defineConfig } from "./quartz/cfg"

// Wrap your config with defineConfig
export default defineConfig({
  // Your existing configuration
})
```

### Step 2: Add Loaders (Optional)

If you want explicit control over content loaders:

```typescript
plugins: {
  loaders: [
    Plugin.Loaders.MarkdownLoader(),
    Plugin.Loaders.AssetLoader(),
  ],
  // ... rest of your plugins
}
```

### Step 3: Configure Resources (Optional)

Add resource management options if needed:

```typescript
configuration: {
  // ... existing config
  resources: {
    minify: true,
    integrity: true,
  },
}
```

### Step 4: Add Layouts (Optional)

Define reusable layouts if you have multiple layout variants:

```typescript
layouts: {
  default: { /* ... */ },
  blog: { /* ... */ },
}
```

## Plugin Development Migration

If you're developing custom plugins, consider adding v5 manifest information:

```typescript
// v4 plugin
export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  markdownPlugins() {
    /* ... */
  },
})

// v5 plugin (backward compatible)
export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  version: "1.0.0", // NEW
  apiVersion: "5.0", // NEW
  capabilities: [], // NEW (optional)
  markdownPlugins() {
    /* ... */
  },
})
```

## Performance Improvements

v5 includes several performance enhancements that work automatically:

- **Content-addressed caching**: Speeds up rebuilds by caching processed content
- **Dependency tracking**: Only rebuilds affected pages
- **Resource optimization**: Better deduplication and bundling

These features work out of the box—no configuration needed!

## Breaking Changes

**There are no breaking changes.** All v4 configurations and plugins continue to work in v5.

## Troubleshooting

### My v4 config doesn't validate with `defineConfig`

The validation in `defineConfig` is stricter than v4. Common issues:

1. **Missing required fields**: Ensure `pageTitle`, `enableSPA`, and `enablePopovers` are set
2. **Invalid types**: Check that booleans are booleans, arrays are arrays, etc.
3. **Plugin arrays**: Make sure transformers, filters, and emitters are arrays

### Lockfile conflicts

If you're having issues with the lockfile:

```bash
# Delete and regenerate
rm quartz.lock
npx quartz build
```

### Layout not found

If you reference a layout in frontmatter that doesn't exist in the registry, the default layout will be used. Define all layouts in your config:

```typescript
layouts: {
  myLayout: {
    /* ... */
  }
}
```

## Getting Help

- [Discord Community](https://discord.gg/cRFFHYye7t)
- [GitHub Issues](https://github.com/jackyzha0/quartz/issues)
- [Documentation](https://quartz.jzhao.xyz/)

## Example: Complete v5 Config

See `quartz.config.v5-example.ts` for a complete example using all v5 features.
