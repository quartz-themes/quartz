/**
 * Quartz v5 Loaders
 * 
 * Built-in loader plugins for different content formats
 */

import { QuartzLoaderPlugin, QuartzLoaderPluginInstance, LoadedContent } from "../loader"
import { BuildCtx } from "../../util/ctx"
import { VFile } from "vfile"
import { slugifyFilePath } from "../../util/path"

/**
 * MarkdownLoader - Default loader for Markdown files
 * Maintains v4 compatibility by delegating to existing parse pipeline
 */
export const MarkdownLoader: QuartzLoaderPlugin = () => {
  const instance: QuartzLoaderPluginInstance = {
    name: "MarkdownLoader",
    version: "5.0.0",
    apiVersion: "5.0",
    supportedExtensions: [".md", ".markdown"],
    
    async load(ctx: BuildCtx, file: VFile): Promise<LoadedContent> {
      // Convert VFile content to string
      const text = file.value.toString()
      
      return {
        kind: "markdown",
        data: text,
        slug: slugifyFilePath(file.path as any),
      }
    },
  }
  
  return instance
}

/**
 * AssetLoader - Loader for static assets (images, PDFs, etc.)
 */
export const AssetLoader: QuartzLoaderPlugin = () => {
  const instance: QuartzLoaderPluginInstance = {
    name: "AssetLoader",
    version: "5.0.0",
    apiVersion: "5.0",
    supportedExtensions: [
      ".png", ".jpg", ".jpeg", ".gif", ".svg", 
      ".pdf", ".mp4", ".webm", ".mp3", ".wav",
      ".webp", ".avif", ".ico"
    ],
    
    async load(ctx: BuildCtx, file: VFile): Promise<LoadedContent> {
      const path = file.path
      const ext = path.substring(path.lastIndexOf("."))
      
      // Determine MIME type based on extension
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".ico": "image/x-icon",
        ".pdf": "application/pdf",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
      }
      
      return {
        kind: "asset",
        data: {
          path: file.path,
          mimeType: mimeTypes[ext] || "application/octet-stream",
        },
        slug: slugifyFilePath(file.path as any),
      }
    },
  }
  
  return instance
}
