# Developing Plugins for Quartz v5

This guide covers how to create plugins for Quartz v5, including the new plugin manifest system, loaders, and best practices.

## Plugin Types

Quartz v5 supports four types of plugins:

1. **Loaders**: Convert input files to processable content
2. **Transformers**: Transform content during the build pipeline
3. **Filters**: Determine which content should be published
4. **Emitters**: Generate output files from processed content

## Plugin Manifest (v5)

All v5 plugins can include manifest information for versioning and capability negotiation:

```typescript
import { PluginManifest } from "./quartz/plugins/manifest"

export interface MyPluginInstance extends PluginManifest {
  name: string
  version: string      // semver (e.g., "1.2.3")
  apiVersion: string   // Quartz API version (e.g., "5.0" or "^5.0")
  capabilities?: string[]        // Optional: ["incremental", "streaming"]
  dependencies?: Record<string, string>  // Plugin dependencies
}
```

## Creating a Loader Plugin

Loaders handle different input file formats:

```typescript
import { QuartzLoaderPlugin, LoadedContent } from "./quartz/plugins/loader"
import { BuildCtx } from "./quartz/util/ctx"
import { VFile } from "vfile"

export const MyLoader: QuartzLoaderPlugin = () => ({
  name: "MyLoader",
  version: "1.0.0",
  apiVersion: "5.0",
  supportedExtensions: [".myformat"],
  
  async load(ctx: BuildCtx, file: VFile): Promise<LoadedContent> {
    const content = file.value.toString()
    
    // Parse your custom format
    const parsed = parseMyFormat(content)
    
    return {
      kind: "custom",
      data: parsed,
      frontmatter: extractFrontmatter(parsed),
      slug: slugifyFilePath(file.path),
    }
  },
  
  // Optional: extract links for graph building
  extractLinks(ctx: BuildCtx, content: LoadedContent) {
    const data = content.data as MyFormatData
    return data.links.map(link => ({
      target: link.href,
      type: "custom",
      text: link.text,
    }))
  },
})

function parseMyFormat(content: string): MyFormatData {
  // Your parsing logic
  return { /* ... */ }
}
```

### Loader Best Practices

1. **Declare all supported extensions**: List all file extensions your loader handles
2. **Extract frontmatter**: If your format supports metadata, extract it
3. **Generate proper slugs**: Ensure consistent slug generation
4. **Handle errors gracefully**: Validate input and provide helpful error messages
5. **Implement link extraction**: If your format has links, extract them for the graph

## Creating a Transformer Plugin

Transformers modify content during the build:

```typescript
import { QuartzTransformerPlugin } from "./quartz/plugins/types"
import { BuildCtx } from "./quartz/util/ctx"

export const MyTransformer: QuartzTransformerPlugin = () => ({
  name: "MyTransformer",
  version: "1.0.0",
  apiVersion: "5.0",
  
  // Optional: text-level transformation
  textTransform(ctx: BuildCtx, src: string): string {
    return src.replace(/foo/g, "bar")
  },
  
  // Optional: Markdown AST transformation
  markdownPlugins(ctx: BuildCtx) {
    return [
      // Return unified/remark plugins
      [remarkPlugin, { option: "value" }],
    ]
  },
  
  // Optional: HTML AST transformation
  htmlPlugins(ctx: BuildCtx) {
    return [
      // Return unified/rehype plugins
      [rehypePlugin, { option: "value" }],
    ]
  },
  
  // Optional: contribute resources
  externalResources(ctx: BuildCtx) {
    return {
      css: ["https://example.com/style.css"],
      js: [{
        src: "https://example.com/script.js",
        loadTime: "afterDOMReady",
        contentType: "external",
      }],
    }
  },
})
```

### Transformer Best Practices

1. **Use the right hook**: Choose between textTransform, markdownPlugins, or htmlPlugins
2. **Preserve existing content**: Don't remove or modify unrelated content
3. **Handle edge cases**: Test with various Markdown/HTML structures
4. **Document options**: Provide clear documentation for plugin options
5. **Version your changes**: Increment version when behavior changes

## Creating a Filter Plugin

Filters determine which content to publish:

```typescript
import { QuartzFilterPlugin } from "./quartz/plugins/types"

export const MyFilter: QuartzFilterPlugin<{ includeTags?: string[] }> = (opts) => ({
  name: "MyFilter",
  version: "1.0.0",
  apiVersion: "5.0",
  
  shouldPublish(ctx, content) {
    const frontmatter = content[1].data.frontmatter
    
    // Example: filter by tags
    if (opts?.includeTags) {
      const tags = frontmatter?.tags || []
      return opts.includeTags.some(tag => tags.includes(tag))
    }
    
    return true
  },
})
```

### Filter Best Practices

1. **Make it configurable**: Use options to control behavior
2. **Return boolean**: Always return true or false
3. **Check for data**: Handle missing frontmatter gracefully
4. **Document criteria**: Clearly explain filtering logic

## Creating an Emitter Plugin

Emitters generate output files:

```typescript
import { QuartzEmitterPlugin } from "./quartz/plugins/types"
import { FilePath } from "./quartz/util/path"

export const MyEmitter: QuartzEmitterPlugin = () => ({
  name: "MyEmitter",
  version: "1.0.0",
  apiVersion: "5.0",
  
  async emit(ctx, content, resources) {
    const filePaths: FilePath[] = []
    
    // Generate files
    for (const item of content) {
      const [tree, vfile] = item
      const slug = vfile.data.slug
      
      // Create output
      const output = generateOutput(tree, vfile, resources)
      
      // Write file
      const outputPath = await ctx.write({
        slug,
        ext: ".html",
        content: output,
      })
      
      filePaths.push(outputPath)
    }
    
    return filePaths
  },
  
  // Optional: partial emit for incremental builds
  partialEmit(ctx, content, resources, changeEvents) {
    // Only emit changed files
    const changed = new Set(changeEvents.map(e => e.path))
    const changedContent = content.filter(([_, vfile]) => 
      changed.has(vfile.path)
    )
    
    if (changedContent.length === 0) {
      return null  // Nothing to emit
    }
    
    return this.emit(ctx, changedContent, resources)
  },
})
```

### Emitter Best Practices

1. **Return file paths**: Always return an array of generated file paths
2. **Use ctx.write()**: Use the provided write method for output
3. **Implement partialEmit**: Support incremental builds when possible
4. **Handle resources**: Include CSS/JS resources in output
5. **Generate valid output**: Ensure generated files are valid

## Plugin Options and TypeScript

Use TypeScript for type-safe options:

```typescript
interface MyPluginOptions {
  enabled?: boolean
  threshold?: number
  customValue?: string
}

export const MyPlugin: QuartzTransformerPlugin<MyPluginOptions> = (opts) => {
  // Access options with type safety
  const enabled = opts?.enabled ?? true
  const threshold = opts?.threshold ?? 10
  
  return {
    name: "MyPlugin",
    version: "1.0.0",
    apiVersion: "5.0",
    // ... implementation
  }
}
```

## Plugin Dependencies

Declare dependencies on other plugins:

```typescript
export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  version: "1.0.0",
  apiVersion: "5.0",
  dependencies: {
    "FrontMatter": "^1.0.0",  // Requires FrontMatter plugin
    "CrawlLinks": "^1.0.0",   // Requires CrawlLinks plugin
  },
  // ... implementation
})
```

## Plugin Capabilities

Declare optional capabilities:

```typescript
export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  version: "1.0.0",
  apiVersion: "5.0",
  capabilities: [
    "incremental",  // Supports incremental builds
    "streaming",    // Supports streaming output
  ],
  // ... implementation
})
```

## Testing Your Plugin

Create tests for your plugin:

```typescript
import { describe, it } from "node:test"
import assert from "node:assert"
import { MyPlugin } from "./MyPlugin"

describe("MyPlugin", () => {
  it("should transform content correctly", () => {
    const plugin = MyPlugin()
    const ctx = createMockContext()
    
    const result = plugin.textTransform(ctx, "input")
    assert.strictEqual(result, "expected output")
  })
})
```

## Publishing Your Plugin

1. **Choose a name**: Use format `@scope/quartz-plugin-name` or `quartz-plugin-name`
2. **Add package.json**: Include proper metadata
3. **Document usage**: Provide clear installation and usage instructions
4. **Version semantically**: Follow semver (major.minor.patch)
5. **Publish to npm**: Make it easy for others to install

Example `package.json`:

```json
{
  "name": "quartz-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My awesome Quartz plugin",
  "main": "index.js",
  "types": "index.d.ts",
  "keywords": ["quartz", "plugin", "markdown"],
  "peerDependencies": {
    "@jackyzha0/quartz": "^4.0.0 || ^5.0.0"
  }
}
```

## Example Plugins

See the built-in plugins for examples:

- **Loaders**: `quartz/plugins/loaders/index.ts`
- **Transformers**: `quartz/plugins/transformers/`
- **Filters**: `quartz/plugins/filters/`
- **Emitters**: `quartz/plugins/emitters/`

## Resources

- [Plugin API Reference](./plugin-api.md)
- [Architecture Overview](./architecture.md)
- [v5 Migration Guide](./v5-migration.md)
