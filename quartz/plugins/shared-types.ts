/**
 * Shared type definitions used across plugins and components.
 *
 * This module breaks coupling between components and emitters by providing
 * common type definitions that both can import without creating circular dependencies.
 */

import { FilePath, FullSlug, SimpleSlug } from "../util/path"

/**
 * Content index entry representing metadata about a single content file.
 *
 * This type is used by:
 * - ContentIndex emitter to generate the content index
 * - Search, Explorer, and Graph components to display and navigate content
 */
export type ContentDetails = {
  slug: FullSlug
  filePath: FilePath
  title: string
  links: SimpleSlug[]
  tags: string[]
  content: string
  richContent?: string
  date?: Date
  description?: string
}

export type ContentIndexMap = Map<FullSlug, ContentDetails>

/**
 * Name of the custom OG images emitter.
 * Used by Head component to check if custom OG images are enabled.
 */
export const CustomOgImagesEmitterName = "CustomOgImages"
