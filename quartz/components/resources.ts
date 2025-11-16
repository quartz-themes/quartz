/**
 * Component Resources Registry
 *
 * This module provides a centralized registry for component scripts and styles.
 * Plugins can request component resources without directly importing from components/scripts/,
 * which helps decouple plugins from component implementations.
 *
 * This follows the decoupling strategy outlined in DESIGN_DOCUMENT_DECOUPLING.md section 3.3.
 */

import { JSResource, CSSResource } from "../util/resources"

// Import all component scripts
// @ts-ignore
import calloutScript from "./scripts/callout.inline"
// @ts-ignore
import checkboxScript from "./scripts/checkbox.inline"
// @ts-ignore
import mermaidScript from "./scripts/mermaid.inline"
import mermaidStyle from "./styles/mermaid.inline.scss"

/**
 * Available component resource types that can be requested by plugins
 */
export type ComponentResourceType = "callout" | "checkbox" | "mermaid"

/**
 * Get JavaScript resources for a specific component
 */
export function getComponentJS(type: ComponentResourceType): JSResource | null {
  switch (type) {
    case "callout":
      return {
        script: calloutScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      }
    case "checkbox":
      return {
        script: checkboxScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      }
    case "mermaid":
      return {
        script: mermaidScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
        moduleType: "module",
      }
    default:
      return null
  }
}

/**
 * Get CSS resources for a specific component
 */
export function getComponentCSS(type: ComponentResourceType): CSSResource | null {
  switch (type) {
    case "mermaid":
      return {
        content: mermaidStyle,
        inline: true,
      }
    default:
      return null
  }
}

/**
 * Get both JS and CSS resources for a component
 */
export function getComponentResources(type: ComponentResourceType): {
  js: JSResource | null
  css: CSSResource | null
} {
  return {
    js: getComponentJS(type),
    css: getComponentCSS(type),
  }
}
