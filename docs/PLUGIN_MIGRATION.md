# Plugin Decoupling Migration Guide

This guide helps plugin authors migrate to the new decoupled plugin architecture introduced by the plugin decoupling strategy.

## Overview

The plugin system has been enhanced with:

1. **Centralized VFile Schema** (`quartz/plugins/vfile-schema.ts`): Type-safe access to vfile data
2. **Plugin Utilities** (`quartz/plugins/plugin-context.ts`): Abstracted utility functions via `ctx.utils`
3. **Test Helpers** (`quartz/plugins/test-helpers.ts`): Mock utilities for testing plugins
4. **Readonly BuildCtx**: Prevents accidental mutations from plugins

## Using the New Plugin Utilities

### Before: Direct Imports

```typescript
import { QuartzTransformerPlugin } from "../types"
import { simplifySlug, transformLink, pathToRoot } from "../../util/path"

export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  htmlPlugins(ctx) {
    // Direct utility imports
    const slug = simplifySlug(someSlug)
    const link = transformLink(from, to, opts)
    const root = pathToRoot(slug)
    // ...
  },
})
```

### After: Using ctx.utils (Optional, Recommended for New Plugins)

```typescript
import { QuartzTransformerPlugin } from "../types"

export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  htmlPlugins(ctx) {
    // Use utilities from context (no imports needed)
    const slug = ctx.utils!.path.simplify(someSlug)
    const link = ctx.utils!.path.transform(from, to, opts)
    const root = ctx.utils!.path.toRoot(slug)
    // ...
  },
})
```

## Available Utilities

### Path Utilities (`ctx.utils.path`)

```typescript
ctx.utils.path.slugify(path: FilePath) => FullSlug
ctx.utils.path.simplify(slug: FullSlug) => SimpleSlug
ctx.utils.path.transform(from: FullSlug, to: string, opts: TransformOptions) => RelativeURL
ctx.utils.path.toRoot(slug: FullSlug) => RelativeURL
ctx.utils.path.split(slug: FullSlug) => [FullSlug, string]
ctx.utils.path.join(...segments: string[]) => FilePath
```

### Resource Utilities (`ctx.utils.resources`)

```typescript
ctx.utils.resources.createExternalJS(src: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => JSResource
ctx.utils.resources.createInlineJS(script: string, loadTime?: "beforeDOMReady" | "afterDOMReady") => JSResource
ctx.utils.resources.createCSS(resource: CSSResource) => CSSResource
```

### Escape Utilities (`ctx.utils.escape`)

```typescript
ctx.utils.escape.html(text: string) => string
```

## VFile Data Type Safety

### Before: Untyped Data Access

```typescript
const toc = file.data.toc // Hope this exists!
```

### After: Type-Safe Access

```typescript
import { QuartzVFileData } from "../vfile-schema"

// TypeScript knows what's available
const toc = file.data.toc // TocEntry[] | undefined (typed!)
```

## Documenting Plugin Data Dependencies

Add JSDoc comments to document what your plugin reads and writes:

```typescript
/**
 * @plugin TableOfContents
 * @category Transformer
 *
 * @reads vfile.data.frontmatter.enableToc
 * @writes vfile.data.toc
 * @writes vfile.data.collapseToc
 *
 * @dependencies None
 */
export const TableOfContents: QuartzTransformerPlugin = () => ({
  // ...
})
```

## Testing Plugins

Use the new test helpers:

```typescript
import { describe, it } from "node:test"
import { createMockPluginContext, createMockVFile } from "../test-helpers"
import { TableOfContents } from "./toc"

describe("TableOfContents", () => {
  it("should generate TOC from headings", async () => {
    const ctx = createMockPluginContext()
    const file = createMockVFile({
      frontmatter: { title: "Test", enableToc: "true" },
    })

    const plugin = TableOfContents()
    const [markdownPlugin] = plugin.markdownPlugins!(ctx)

    // Test the plugin...
  })
})
```

## Migration Strategy

1. **Existing Plugins**: No changes required! The old import pattern still works.
2. **New Plugins**: Use `ctx.utils` for better decoupling and testability.
3. **Gradual Migration**: Update plugins incrementally as you work on them.

## Important Notes

### BuildCtx is Now Readonly

Plugins receive a readonly `BuildCtx` which prevents mutations:

```typescript
// ❌ This will cause a TypeScript error
ctx.allSlugs.push(newSlug)

// ✅ Instead, write to vfile.data
file.data.aliases = [newSlug]
```

### Backward Compatibility

All existing plugins continue to work without changes. The new utilities are optional and additive.

## Benefits

- **Better Testability**: Mock utilities easily in tests
- **Type Safety**: Centralized vfile schema with autocomplete
- **Reduced Coupling**: Plugins don't import utilities directly
- **Clearer Contracts**: Document what plugins read/write
- **Future-Proof**: Easier to version and update utilities

## Adding Custom VFile Fields

Custom plugins can add their own fields to the vfile data using TypeScript module augmentation:

```typescript
import { QuartzTransformerPlugin } from "../types"

export interface MyCustomData {
  customField: string
  anotherField: number[]
}

/**
 * @plugin MyCustomPlugin
 * @category Transformer
 *
 * @writes vfile.data.myCustomData
 */
export const MyCustomPlugin: QuartzTransformerPlugin = () => ({
  name: "MyCustomPlugin",
  markdownPlugins() {
    return [
      () => {
        return (tree, file) => {
          // Add your custom data
          file.data.myCustomData = {
            customField: "value",
            anotherField: [1, 2, 3],
          }
        }
      },
    ]
  },
})

// Extend the VFile DataMap with your custom fields
declare module "vfile" {
  interface DataMap {
    myCustomData?: MyCustomData
  }
}
```

**How it works:**

- TypeScript's module augmentation allows multiple `declare module "vfile"` statements
- Each declaration merges into the same `DataMap` interface
- Your custom fields become type-safe alongside built-in fields
- The centralized `vfile-schema.ts` doesn't prevent custom extensions

**Best practices:**

1. Export your custom data type interfaces for reuse
2. Use optional fields (`?`) to indicate data may not always be present
3. Document what your plugin writes with JSDoc `@writes` annotation
4. Add the module augmentation at the bottom of your plugin file

This allows third-party and custom plugins to extend the vfile data structure without modifying core files.

## Next Steps

For more details, see:

- `quartz/plugins/vfile-schema.ts` - VFile data types
- `quartz/plugins/plugin-context.ts` - Plugin utilities
- `quartz/plugins/test-helpers.ts` - Testing utilities
- `DESIGN_DOCUMENT_DECOUPLING.md` - Complete strategy document
