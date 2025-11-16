import { QuartzConfig } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { FileTrieNode } from "./fileTrie"
import { FilePath, FullSlug } from "./path"
import type { PluginUtilities } from "../plugins/plugin-context"

export interface Argv {
  directory: string
  verbose: boolean
  output: string
  serve: boolean
  watch: boolean
  port: number
  wsPort: number
  remoteDevHost?: string
  concurrency?: number
}

export type ReadonlyArgv = Readonly<Argv>

export type BuildTimeTrieData = QuartzPluginData & {
  slug: string
  title: string
  filePath: string
}

export interface BuildCtx {
  readonly buildId: string
  readonly argv: ReadonlyArgv
  readonly cfg: QuartzConfig
  readonly allSlugs: ReadonlyArray<FullSlug>
  readonly allFiles: ReadonlyArray<FilePath>
  readonly trie?: FileTrieNode<BuildTimeTrieData>
  readonly incremental: boolean
  readonly utils?: PluginUtilities
}

/**
 * Mutable version of BuildCtx for build orchestration.
 * Plugins should use BuildCtx (readonly) instead.
 */
export interface MutableBuildCtx {
  buildId: string
  argv: Argv
  cfg: QuartzConfig
  allSlugs: FullSlug[]
  allFiles: FilePath[]
  trie?: FileTrieNode<BuildTimeTrieData>
  incremental: boolean
  utils?: PluginUtilities
}

export function trieFromAllFiles(allFiles: QuartzPluginData[]): FileTrieNode<BuildTimeTrieData> {
  const trie = new FileTrieNode<BuildTimeTrieData>([])
  allFiles.forEach((file) => {
    if (file.frontmatter) {
      trie.add({
        ...file,
        slug: file.slug!,
        title: file.frontmatter.title,
        filePath: file.filePath!,
      })
    }
  })

  return trie
}

export type WorkerSerializableBuildCtx = Omit<BuildCtx, "cfg" | "trie">
