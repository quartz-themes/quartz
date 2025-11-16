# Design Document: Plugin Decoupling Strategy

## Executive Summary

This document outlines a comprehensive strategy for decoupling the plugin architecture in Quartz. The goal is to reduce tight coupling between transformers, filters, emitters, and components, enabling better modularity, maintainability, and extensibility. The decoupling will standardize data exchange through the `vfile` data property while minimizing direct dependencies on utility functions and other plugins.

## 1. Current State Analysis

### 1.1 Plugin Architecture Overview

Quartz currently has three main plugin types:

1. **Transformers** (`QuartzTransformerPlugin`): Transform markdown/HTML content during the build process
   - Can provide `textTransform`, `markdownPlugins`, `htmlPlugins`, and `externalResources`
   - Examples: FrontMatter, TableOfContents, CrawlLinks, ObsidianFlavoredMarkdown

2. **Filters** (`QuartzFilterPlugin`): Determine which content should be published
   - Implement `shouldPublish` method
   - Examples: RemoveDrafts, ExplicitPublish

3. **Emitters** (`QuartzEmitterPlugin`): Generate output files from processed content
   - Implement `emit` and optionally `partialEmit` methods
   - Can provide `getQuartzComponents` and `externalResources`
   - Examples: ContentPage, ComponentResources, Assets, ContentIndex

### 1.2 Current Data Flow

```
Content Files → Transformers → Filters → Emitters → Output Files
                     ↓            ↓          ↓
                 vfile.data   vfile.data  vfile.data
```

### 1.3 Identified Coupling Issues

#### 1.3.1 Direct Utility Dependencies

**Issue**: Plugins are tightly coupled to utility modules in `quartz/util/`:

- **Path utilities** (`util/path.ts`): Nearly all plugins import path manipulation functions
  - `slugifyFilePath`, `simplifySlug`, `transformLink`, `splitAnchor`, `pathToRoot`
  - Used in: all transformers, most emitters
  
- **Resource utilities** (`util/resources.tsx`): Emitters depend on resource management
  - `StaticResources`, `JSResource`, `CSSResource`
  - Used in: ComponentResources, all page emitters
  
- **BuildCtx** (`util/ctx.ts`): Shared context passed to all plugins
  - Contains: `argv`, `cfg`, `allSlugs`, `allFiles`, `buildId`, `incremental`
  - Provides global state access to all plugins

**Impact**: 
- Changes to utility functions require updates across many plugins
- Hard to test plugins in isolation
- Difficult to version or swap utility implementations

#### 1.3.2 Cross-Plugin Dependencies

**Issue**: Plugins directly import and depend on other plugins:

- **Component dependencies in transformers**:
  - `transformers/ofm.ts` imports component scripts: `callout.inline`, `checkbox.inline`, `mermaid.inline`
  - Creates tight coupling between content transformation and UI components

- **Plugin data dependencies**:
  - Emitters access data set by specific transformers (e.g., `toc`, `links`, `frontmatter`)
  - No formal contract for what data transformers provide
  - Breaking changes in one transformer can break dependent emitters/components

**Impact**:
- Cannot reorder or remove plugins without checking dependencies
- Difficult to create alternative implementations
- Hidden dependencies make refactoring risky

#### 1.3.3 Component-Plugin Coupling

**Issue**: Bidirectional dependencies between components and plugins:

- **Components depend on plugin data**:
  - `components/Date.tsx`, `components/PageList.tsx` import `QuartzPluginData`
  - `components/scripts/explorer.inline.ts` imports `ContentDetails` from `emitters/contentIndex`
  
- **Plugins depend on components**:
  - `emitters/componentResources.ts` imports component scripts and styles
  - `emitters/contentPage.tsx` imports layout components
  
- **Emitters construct component instances**:
  - `getQuartzComponents()` method creates tight coupling between emitters and components

**Impact**:
- Cannot change component interface without updating plugins
- Cannot swap rendering engines easily
- Component reusability is limited

#### 1.3.4 VFile Module Augmentation Pattern

**Issue**: Plugins extend the `vfile` DataMap through module augmentation:

Current approach (7 augmentations found):
```typescript
declare module "vfile" {
  interface DataMap {
    links: SimpleSlug[]
    toc: TocEntry[]
    frontmatter: { ... }
    // etc.
  }
}
```

**Problems**:
- No central registry of available data properties
- Type declarations scattered across plugin files
- No validation that required data exists
- Difficult to track data flow between plugins

**Impact**:
- Hard to understand what data is available at each stage
- No compile-time guarantees about data presence
- Plugin authors must read all transformer code to know available data

#### 1.3.5 BuildCtx as Global State

**Issue**: `BuildCtx` provides global mutable state:

```typescript
interface BuildCtx {
  buildId: string
  argv: Argv
  cfg: QuartzConfig
  allSlugs: FullSlug[]  // Mutable array
  allFiles: FilePath[]  // Mutable array
  trie?: FileTrieNode<BuildTimeTrieData>
  incremental: boolean
}
```

**Problems**:
- Plugins can mutate `allSlugs` array (seen in FrontMatter plugin)
- Side effects not clearly tracked
- Difficult to parallelize plugin execution
- Hard to test plugins without full BuildCtx

**Impact**:
- Race conditions in concurrent scenarios
- Unpredictable plugin behavior
- Testing requires complex mocking

### 1.4 Dependency Graph Analysis

```
Plugins Layer
├── Transformers
│   ├── → util/path (high coupling)
│   ├── → util/escape (medium coupling)
│   ├── → components/scripts (medium coupling)
│   └── → vfile.data (correct pattern)
│
├── Filters
│   ├── → util/path (low coupling)
│   └── → vfile.data (correct pattern)
│
└── Emitters
    ├── → util/path (high coupling)
    ├── → util/resources (high coupling)
    ├── → util/theme (medium coupling)
    ├── → components/* (high coupling)
    ├── → other emitters (low coupling)
    └── → vfile.data (correct pattern)

Components Layer
├── → plugins/vfile (high coupling)
├── → plugins/emitters (medium coupling)
└── → util/path (medium coupling)
```

### 1.5 Current Strengths

Despite coupling issues, the current architecture has strengths to preserve:

1. **VFile-based data passing**: Using `vfile.data` for inter-plugin communication is sound
2. **Plugin instance pattern**: Functional plugin factories with options are flexible
3. **Unified processing**: Using unified/remark/rehype ecosystem is appropriate
4. **Type safety**: TypeScript provides good type checking for plugin interfaces
5. **Clear plugin categories**: Separation into transformers/filters/emitters is logical

## 2. Decoupling Goals

### 2.1 Primary Objectives

1. **Isolate plugin logic**: Each plugin should be independently testable
2. **Minimize shared dependencies**: Reduce coupling to utility modules
3. **Standardize data contracts**: Formalize vfile data schema
4. **Remove cross-plugin imports**: Eliminate direct plugin-to-plugin dependencies
5. **Decouple components**: Separate component definitions from plugin logic

### 2.2 Non-Goals

1. **Not** changing the unified/remark/rehype pipeline architecture
2. **Not** removing the BuildCtx concept entirely (it provides necessary context)
3. **Not** breaking the transformer → filter → emitter processing order
4. **Not** requiring complete rewrites of existing plugins (incremental migration)

## 3. Decoupling Strategy

### 3.1 Phase 1: VFile Data Contract Formalization

#### 3.1.1 Create Central Data Schema Registry

**Action**: Create `quartz/plugins/vfile-schema.ts` to centralize all vfile data definitions.

```typescript
// quartz/plugins/vfile-schema.ts

/**
 * Core data set by the processing pipeline before any plugins
 */
export interface CoreVFileData {
  slug: FullSlug
  filePath: FilePath
  relativePath: FilePath
}

/**
 * Data contributed by transformer plugins
 */
export interface TransformerVFileData {
  // From FrontMatter transformer
  frontmatter?: {
    title: string
    tags?: string[]
    aliases?: string[]
    created?: string
    modified?: string
    published?: string
    description?: string
    draft?: boolean
    // ... other frontmatter fields
  }
  aliases?: FullSlug[]
  
  // From TableOfContents transformer
  toc?: TocEntry[]
  collapseToc?: boolean
  
  // From CrawlLinks transformer
  links?: SimpleSlug[]
  
  // From Description transformer
  description?: string
  
  // Add other transformer data here
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
```

**Benefits**:
- Single source of truth for vfile data structure
- IDE autocomplete for available data
- Easy to see what each plugin contributes
- Compile-time type checking for data access

#### 3.1.2 Document Data Dependencies

**Action**: Each plugin should declare its data dependencies in a comment header.

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
export const TableOfContents: QuartzTransformerPlugin = ...
```

### 3.2 Phase 2: Utility Function Abstraction

#### 3.2.1 Create Plugin Utility Interface

**Action**: Create an abstraction layer for utility functions passed through context.

```typescript
// quartz/plugins/plugin-context.ts

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
    createJS: (opts: JSResourceOptions) => JSResource
    createCSS: (opts: CSSResourceOptions) => CSSResource
  }
  
  // Other utilities as needed
  escape: {
    html: (text: string) => string
  }
}

export interface PluginContext {
  // Read-only configuration
  readonly config: QuartzConfig
  readonly buildId: string
  readonly argv: Readonly<Argv>
  
  // Shared data (read-only for plugins)
  readonly allSlugs: ReadonlyArray<FullSlug>
  readonly allFiles: ReadonlyArray<FilePath>
  
  // Utility functions
  utils: PluginUtilities
}
```

**Benefits**:
- Plugins don't directly import util modules
- Can mock utilities for testing
- Can version utility interfaces separately
- Clearer what capabilities plugins have access to

#### 3.2.2 Gradual Migration Path

**Action**: Allow both old and new patterns during transition.

```typescript
// Support both patterns
export const CrawlLinks: QuartzTransformerPlugin<Options> = (userOpts) => {
  return {
    name: "LinkProcessing",
    htmlPlugins(ctx) {
      // New pattern (preferred)
      const simplify = ctx.utils?.path.simplify ?? simplifySlug
      
      // Old pattern (still works)
      // import { simplifySlug } from "../../util/path"
      
      return [/* ... */]
    }
  }
}
```

### 3.3 Phase 3: Component Decoupling

#### 3.3.1 Separate Component Registry

**Action**: Create a component registry independent of emitters.

```typescript
// quartz/components/registry.ts

export interface ComponentRegistry {
  register(name: string, component: QuartzComponent): void
  get(name: string): QuartzComponent | undefined
  getResources(): {
    css: string[]
    beforeDOMLoaded: string[]
    afterDOMLoaded: string[]
  }
}

// quartz/plugins/types.ts
export type QuartzEmitterPluginInstance = {
  name: string
  emit: (ctx: PluginContext, content: ProcessedContent[], resources: StaticResources) => ...
  partialEmit?: ...
  
  // Instead of getQuartzComponents:
  requiredComponents?: string[]  // Array of component names
}
```

**Benefits**:
- Components defined once, referenced by name
- Emitters don't construct component instances
- Easier to swap component implementations
- Component resources collected independently

#### 3.3.2 Move Component Scripts Out of Transformers

**Action**: Register component scripts with components, not import in transformers.

```typescript
// Current problem:
// quartz/plugins/transformers/ofm.ts
import calloutScript from "../../components/scripts/callout.inline"

// New approach:
// quartz/components/Callout.tsx
export default (() => {
  const Callout: QuartzComponent = (props) => { /* ... */ }
  Callout.afterDOMLoaded = calloutScript
  return Callout
}) satisfies QuartzComponentConstructor

// Transformer just declares it needs the component:
export const ObsidianFlavoredMarkdown: QuartzTransformerPlugin = (opts) => {
  return {
    name: "ObsidianFlavoredMarkdown",
    requiredComponents: ["Callout", "Checkbox", "Mermaid"],
    // ... rest of plugin
  }
}
```

### 3.4 Phase 4: Remove BuildCtx Mutation

#### 3.4.1 Make BuildCtx Immutable

**Action**: Prevent plugins from mutating shared state.

```typescript
// quartz/util/ctx.ts
export interface BuildCtx {
  readonly buildId: string
  readonly argv: Readonly<Argv>
  readonly cfg: QuartzConfig
  readonly allSlugs: ReadonlyArray<FullSlug>  // Changed from mutable array
  readonly allFiles: ReadonlyArray<FilePath>  // Changed from mutable array
  readonly trie?: FileTrieNode<BuildTimeTrieData>
  readonly incremental: boolean
}
```

#### 3.4.2 Handle Alias Registration Differently

**Action**: FrontMatter plugin currently mutates `ctx.allSlugs`. Instead, collect aliases separately.

```typescript
// In parse.ts or similar orchestration code
const parseResult = await parseMarkdown(ctx, filePaths)
const { parsedFiles, discoveredAliases } = parseResult

// Update context immutably
const updatedCtx = {
  ...ctx,
  allSlugs: [...ctx.allSlugs, ...discoveredAliases]
}
```

### 3.5 Phase 5: Plugin Lifecycle Hooks

#### 3.5.1 Add Initialization Hook

**Action**: Allow plugins to declare initialization needs without side effects.

```typescript
export interface QuartzTransformerPluginInstance {
  name: string
  
  // New: declare what this plugin will contribute
  init?: (ctx: PluginContext) => {
    vfileDataKeys?: string[]  // What keys this plugin writes to vfile.data
    aliases?: FullSlug[]       // Any aliases this plugin discovers
    externalResources?: Partial<StaticResources>
  }
  
  textTransform?: (ctx: PluginContext, src: string) => string
  markdownPlugins?: (ctx: PluginContext) => PluggableList
  htmlPlugins?: (ctx: PluginContext) => PluggableList
}
```

**Benefits**:
- Plugins declare their effects upfront
- Build system can collect all aliases before processing
- Better static analysis of plugin behavior

### 3.6 Phase 6: Testing Infrastructure

#### 3.6.1 Plugin Test Helpers

**Action**: Create utilities for testing plugins in isolation.

```typescript
// quartz/plugins/test-helpers.ts

export function createMockPluginContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    config: createMockConfig(),
    buildId: "test-build",
    argv: createMockArgv(),
    allSlugs: [],
    allFiles: [],
    utils: createMockUtilities(),
    ...overrides
  }
}

export function createMockVFile(data?: Partial<QuartzVFileData>): VFile {
  const file = new VFile("")
  file.data = {
    slug: "test" as FullSlug,
    filePath: "test.md" as FilePath,
    relativePath: "test.md" as FilePath,
    ...data
  }
  return file
}

// Usage in tests:
describe("TableOfContents", () => {
  it("should generate TOC from headings", () => {
    const ctx = createMockPluginContext()
    const file = createMockVFile({
      frontmatter: { enableToc: true }
    })
    
    const plugin = TableOfContents()
    const [markdownPlugin] = plugin.markdownPlugins!(ctx)
    
    // Test the plugin...
  })
})
```

## 4. Implementation Roadmap

### 4.1 Phase 1: Foundation (Weeks 1-2)

**Deliverables**:
- [ ] Create `vfile-schema.ts` with centralized data definitions
- [ ] Document existing plugins' data dependencies
- [ ] Create plugin test helper utilities
- [ ] Write tests for 2-3 representative plugins using new helpers

**Risks**: Low - purely additive changes

### 4.2 Phase 2: Utility Abstraction (Weeks 3-4)

**Deliverables**:
- [ ] Create `plugin-context.ts` with PluginUtilities interface
- [ ] Implement utility wrappers
- [ ] Update BuildCtx to include utils
- [ ] Migrate 1-2 simple plugins to use new pattern
- [ ] Document migration guide for plugin authors

**Risks**: Medium - requires careful API design

### 4.3 Phase 3: Component Decoupling (Weeks 5-7)

**Deliverables**:
- [ ] Create component registry system
- [ ] Move component scripts from transformers to components
- [ ] Update emitters to use component references instead of construction
- [ ] Migrate ComponentResources emitter
- [ ] Update all page emitters

**Risks**: High - touches many files, requires coordination

### 4.4 Phase 4: Immutability & Safety (Weeks 8-9)

**Deliverables**:
- [ ] Make BuildCtx immutable
- [ ] Refactor alias registration in FrontMatter
- [ ] Update orchestration code to handle discovered aliases
- [ ] Add runtime checks for mutation attempts

**Risks**: Medium - may reveal unexpected mutation patterns

### 4.5 Phase 5: Full Migration (Weeks 10-12)

**Deliverables**:
- [ ] Migrate all remaining transformers to new pattern
- [ ] Migrate all filters to new pattern  
- [ ] Migrate all emitters to new pattern
- [ ] Update all documentation
- [ ] Add deprecation warnings for old patterns

**Risks**: Medium - requires comprehensive testing

### 4.6 Phase 6: Cleanup (Weeks 13-14)

**Deliverables**:
- [ ] Remove deprecated direct utility imports
- [ ] Consolidate module augmentations
- [ ] Performance benchmarks comparing before/after
- [ ] Final documentation updates

**Risks**: Low - cleanup phase

## 5. Migration Guide for Plugin Authors

### 5.1 VFile Data Access

**Before**:
```typescript
// Hope this exists and is the right type
const toc = file.data.toc
```

**After**:
```typescript
import { QuartzVFileData } from "../vfile-schema"

// Type-safe access with explicit type
const toc: TocEntry[] | undefined = file.data.toc
```

### 5.2 Utility Usage

**Before**:
```typescript
import { simplifySlug, transformLink } from "../../util/path"

const simple = simplifySlug(file.data.slug!)
const link = transformLink(file.data.slug!, dest, opts)
```

**After**:
```typescript
// No imports needed - use ctx.utils

const simple = ctx.utils.path.simplify(file.data.slug!)
const link = ctx.utils.path.transform(file.data.slug!, dest, opts)
```

### 5.3 Component Dependencies

**Before**:
```typescript
import calloutScript from "../../components/scripts/callout.inline"

export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  externalResources: () => ({
    js: [{ script: calloutScript, loadTime: "afterDOMReady", contentType: "inline" }]
  })
})
```

**After**:
```typescript
export const MyPlugin: QuartzTransformerPlugin = () => ({
  name: "MyPlugin",
  requiredComponents: ["Callout"],  // Component system handles resources
})
```

### 5.4 Data Declaration

**Before**:
```typescript
// At bottom of plugin file
declare module "vfile" {
  interface DataMap {
    myData: MyDataType
  }
}
```

**After**:
```typescript
// In vfile-schema.ts (centralized)
export interface TransformerVFileData {
  myData?: MyDataType
}

// In plugin file
/**
 * @writes vfile.data.myData
 */
export const MyPlugin = ...
```

## 6. Success Criteria

### 6.1 Quantitative Metrics

- [ ] **Import reduction**: 80% reduction in direct utility imports from plugins
- [ ] **Test coverage**: All plugins have unit tests with mocked context
- [ ] **Type safety**: Zero `any` types in vfile data access
- [ ] **Module augmentations**: Reduce from 7+ scattered declarations to 1 central registry
- [ ] **Build time**: No regression in build performance (±5% acceptable)

### 6.2 Qualitative Metrics

- [ ] **Developer experience**: Plugin authors report easier development
- [ ] **Maintainability**: Can modify utility functions without touching plugins
- [ ] **Testability**: Plugins can be tested in isolation without full build setup
- [ ] **Documentation**: Clear contracts for plugin data dependencies
- [ ] **Extensibility**: Third-party plugins can be developed without deep codebase knowledge

## 7. Risk Mitigation

### 7.1 Breaking Changes

**Risk**: Existing plugins and user configurations may break.

**Mitigation**:
- Maintain backward compatibility during transition
- Provide deprecation warnings, not hard errors
- Offer automatic migration script where possible
- Extensive documentation for manual migration

### 7.2 Performance Regression

**Risk**: Abstraction layers may slow down build process.

**Mitigation**:
- Benchmark before and after changes
- Keep utility wrappers thin (inline where possible)
- Profile hot paths
- Accept minor overhead for significant maintainability gains

### 7.3 Incomplete Migration

**Risk**: Some plugins may not get migrated, leaving inconsistent codebase.

**Mitigation**:
- Start with high-value, frequently-used plugins
- Set a timeline for migration completion
- Make old patterns emit warnings in development mode
- Eventually make old patterns build errors for new plugins

### 7.4 Testing Coverage Gaps

**Risk**: Migration may introduce bugs not caught by tests.

**Mitigation**:
- Write tests before refactoring
- Use existing build as integration test baseline
- Test against real content repositories
- Beta period with early adopters

## 8. Alternative Approaches Considered

### 8.1 Complete Plugin Rewrite

**Approach**: Redesign plugin system from scratch with new API.

**Pros**: Could achieve ideal architecture immediately.

**Cons**: 
- Massive breaking change
- All existing plugins would break
- User configurations would need updates
- High risk, long timeline

**Decision**: Rejected in favor of incremental migration.

### 8.2 Monolithic Utility Library

**Approach**: Create single `PluginUtils` class with all helper methods.

**Pros**: Simple, one import for plugins.

**Cons**:
- Tight coupling to monolithic class
- Harder to test individual utilities
- Namespace pollution

**Decision**: Rejected in favor of categorized utility interface.

### 8.3 Dependency Injection Framework

**Approach**: Use DI framework like InversifyJS for plugin dependencies.

**Pros**: Industry-standard pattern, very flexible.

**Cons**:
- Adds complexity and runtime overhead
- Steep learning curve for plugin authors
- Overkill for current needs

**Decision**: Rejected in favor of simpler context-based approach.

## 9. Open Questions

1. **Component Script Loading**: Should component scripts be eagerly loaded or lazy loaded? Need to balance bundle size vs. HTTP requests.

2. **Plugin Ordering**: Should plugins be able to declare ordering constraints (e.g., "run after FrontMatter")? Or continue relying on config order?

3. **Parallel Processing**: After decoupling, should we enable parallel transformer execution? Would require analysis of data dependencies.

4. **Plugin Versioning**: Should plugins declare compatible API versions? How to handle version mismatches?

5. **Hot Reload**: Can decoupling enable better hot module replacement during development?

## 10. Future Enhancements

### 10.1 Plugin Marketplace

With decoupled plugins, could create:
- NPM packages for individual plugins
- Community plugin registry
- Plugin dependency management
- Semantic versioning for plugin APIs

### 10.2 Plugin Performance Profiling

With clear plugin boundaries:
- Per-plugin performance metrics
- Identify slow plugins
- Optimize critical path
- Conditional plugin execution

### 10.3 Plugin Composition

With standardized interfaces:
- Higher-order plugins that compose others
- Plugin pipelines
- Conditional plugin chains
- Plugin templates

### 10.4 Alternative Renderers

With component decoupling:
- Support React instead of Preact
- Support Vue components
- Support custom rendering engines
- Multi-framework support

## 11. Conclusion

The proposed decoupling strategy balances the need for cleaner architecture with pragmatic migration concerns. By executing this plan in phases over approximately 14 weeks, we can significantly improve the maintainability and extensibility of the Quartz plugin system while minimizing disruption to existing users.

The key principles guiding this effort are:

1. **Incremental Migration**: No big-bang rewrites; gradual, testable changes
2. **Backward Compatibility**: Support old patterns during transition
3. **Clear Contracts**: Formalize data and dependency contracts
4. **Enhanced Testability**: Enable isolated plugin testing
5. **Preserved Strengths**: Keep what works (vfile, unified, TypeScript)

Success will be measured not just by code metrics, but by improved developer experience for both core maintainers and plugin authors. A well-decoupled plugin system will enable faster iteration, easier debugging, and broader community participation in extending Quartz.

## Appendix A: Affected Files

### Core Plugin System
- `quartz/plugins/types.ts` - Plugin type definitions
- `quartz/plugins/index.ts` - Plugin exports and utilities
- `quartz/plugins/vfile.ts` - VFile type augmentations

### Transformers (9 files)
- `quartz/plugins/transformers/frontmatter.ts`
- `quartz/plugins/transformers/links.ts`
- `quartz/plugins/transformers/toc.ts`
- `quartz/plugins/transformers/ofm.ts`
- `quartz/plugins/transformers/description.ts`
- `quartz/plugins/transformers/lastmod.ts`
- `quartz/plugins/transformers/latex.ts`
- `quartz/plugins/transformers/syntax.ts`
- `quartz/plugins/transformers/citations.ts`

### Filters (2 files)
- `quartz/plugins/filters/draft.ts`
- `quartz/plugins/filters/explicit.ts`

### Emitters (14 files)
- `quartz/plugins/emitters/componentResources.ts`
- `quartz/plugins/emitters/contentPage.tsx`
- `quartz/plugins/emitters/tagPage.tsx`
- `quartz/plugins/emitters/folderPage.tsx`
- `quartz/plugins/emitters/contentIndex.tsx`
- `quartz/plugins/emitters/aliases.ts`
- `quartz/plugins/emitters/assets.ts`
- `quartz/plugins/emitters/static.ts`
- `quartz/plugins/emitters/404.tsx`
- `quartz/plugins/emitters/favicon.ts`
- `quartz/plugins/emitters/cname.ts`
- `quartz/plugins/emitters/ogImage.tsx`
- `quartz/plugins/emitters/helpers.ts`
- `quartz/plugins/emitters/index.ts`

### Components (~30 files)
All files in `quartz/components/` that import from `plugins/`

### Utilities
- `quartz/util/ctx.ts`
- `quartz/util/path.ts`
- `quartz/util/resources.tsx`
- `quartz/util/theme.ts`
- `quartz/util/escape.ts`

### Build System
- `quartz/build.ts`
- `quartz/processors/parse.ts`
- `quartz/processors/filter.ts`
- `quartz/processors/emit.ts`

**Total Estimated Files to Modify**: ~65 files

## Appendix B: References

- [VFile Documentation](https://github.com/vfile/vfile)
- [Unified Collective](https://unifiedjs.com/)
- [Remark Plugins](https://github.com/remarkjs/remark/blob/main/doc/plugins.md)
- [Rehype Plugins](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md)
- [TypeScript Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)
