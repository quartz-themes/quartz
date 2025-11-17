import { QuartzTransformerPlugin } from "../types"
import remarkBreaks from "remark-breaks"

/**
 * @plugin HardLineBreaks
 * @category Transformer
 *
 * @reads None
 * @writes None (transforms markdown to respect hard line breaks)
 *
 * @dependencies None
 */
export const HardLineBreaks: QuartzTransformerPlugin = () => {
  return {
    name: "HardLineBreaks",
    markdownPlugins() {
      return [remarkBreaks]
    },
  }
}
