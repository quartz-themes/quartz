/**
 * Example Quartz v5 Configuration
 *
 * This file demonstrates the new v5 features while maintaining
 * backward compatibility with v4 configurations.
 */

import { defineConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import * as Component from "./quartz/components"

/**
 * Example v5 configuration with enhanced features
 */
const v5Config = defineConfig({
  configuration: {
    pageTitle: "My Digital Garden (v5)",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "example.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",

    // v5: Enhanced resource management
    resources: {
      cdnCaching: false, // Explicit opt-in for CDN
      allowedDomains: ["fonts.googleapis.com", "fonts.gstatic.com"],
      googleFonts: {
        enabled: true,
        families: ["Inter", "JetBrains Mono"],
      },
      minify: true, // Minify CSS/JS
      bundling: "auto", // Auto-detect bundling strategy
      integrity: true, // Generate SRI hashes
    },

    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#284b63",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#7b97aa",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },

  plugins: {
    // v5: Loaders for multi-format support
    loaders: [
      Plugin.Loaders.MarkdownLoader(), // Default Markdown loader
      Plugin.Loaders.AssetLoader(), // Asset loader (images, PDFs, etc.)
    ],

    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],

    filters: [Plugin.RemoveDrafts()],

    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },

  // v5: Layout registry - pre-define layouts that can be selected in frontmatter
  layouts: {
    default: {
      id: "default",
      name: "Default Layout",
      description: "Standard layout with sidebar navigation",
      layout: {
        head: Component.Head(),
        header: [],
        beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle()],
        pageBody: Component.Content(),
        afterBody: [],
        left: [
          Component.PageTitle(),
          Component.MobileOnly(Component.Spacer()),
          Component.Search(),
          Component.Darkmode(),
          Component.DesktopOnly(Component.Explorer()),
        ],
        right: [
          Component.Graph(),
          Component.DesktopOnly(Component.TableOfContents()),
          Component.Backlinks(),
        ],
        footer: Component.Footer({
          links: {
            GitHub: "https://github.com/jackyzha0/quartz",
            "Discord Community": "https://discord.gg/cRFFHYye7t",
          },
        }),
      },
    },

    minimal: {
      id: "minimal",
      name: "Minimal Layout",
      description: "Clean layout without sidebars",
      layout: {
        head: Component.Head(),
        header: [],
        beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle()],
        pageBody: Component.Content(),
        afterBody: [],
        left: [],
        right: [],
        footer: Component.Footer({
          links: {
            GitHub: "https://github.com/jackyzha0/quartz",
          },
        }),
      },
    },
  },
})

export default v5Config
