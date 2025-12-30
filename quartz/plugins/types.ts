import { PluggableList } from "unified"
import { StaticResources } from "../util/resources"
import { ProcessedContent } from "./vfile"
import { QuartzComponent } from "../components/types"
import { FilePath } from "../util/path"
import { BuildCtx } from "../util/ctx"
import { VFile } from "vfile"
import { PluginManifest } from "./manifest"
import { QuartzLoaderPluginInstance } from "./loader"

export interface PluginTypes {
  transformers: QuartzTransformerPluginInstance[]
  filters: QuartzFilterPluginInstance[]
  emitters: QuartzEmitterPluginInstance[]
  loaders?: QuartzLoaderPluginInstance[]  // v5: optional for backward compatibility
}

type OptionType = object | undefined
type ExternalResourcesFn = (ctx: BuildCtx) => Partial<StaticResources> | undefined
export type QuartzTransformerPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzTransformerPluginInstance

// v5: Transformers can optionally include manifest for versioning
export type QuartzTransformerPluginInstance = {
  name: string
  textTransform?: (ctx: BuildCtx, src: string) => string
  markdownPlugins?: (ctx: BuildCtx) => PluggableList
  htmlPlugins?: (ctx: BuildCtx) => PluggableList
  externalResources?: ExternalResourcesFn
} & Partial<PluginManifest>  // v5: optional manifest fields

export type QuartzFilterPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzFilterPluginInstance

// v5: Filters can optionally include manifest for versioning
export type QuartzFilterPluginInstance = {
  name: string
  shouldPublish(ctx: BuildCtx, content: ProcessedContent): boolean
} & Partial<PluginManifest>  // v5: optional manifest fields

export type ChangeEvent = {
  type: "add" | "change" | "delete"
  path: FilePath
  file?: VFile
}

export type QuartzEmitterPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzEmitterPluginInstance

// v5: Emitters can optionally include manifest for versioning
export type QuartzEmitterPluginInstance = {
  name: string
  emit: (
    ctx: BuildCtx,
    content: ProcessedContent[],
    resources: StaticResources,
  ) => Promise<FilePath[]> | AsyncGenerator<FilePath>
  partialEmit?: (
    ctx: BuildCtx,
    content: ProcessedContent[],
    resources: StaticResources,
    changeEvents: ChangeEvent[],
  ) => Promise<FilePath[]> | AsyncGenerator<FilePath> | null
  /**
   * Returns the components (if any) that are used in rendering the page.
   * This helps Quartz optimize the page by only including necessary resources
   * for components that are actually used.
   */
  getQuartzComponents?: (ctx: BuildCtx) => QuartzComponent[]
  externalResources?: ExternalResourcesFn
} & Partial<PluginManifest>  // v5: optional manifest fields
