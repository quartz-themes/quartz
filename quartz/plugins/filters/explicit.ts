import { QuartzFilterPlugin } from "../types"

/**
 * @plugin ExplicitPublish
 * @category Filter
 *
 * @reads vfile.data.frontmatter.publish
 *
 * @dependencies None
 */
export const ExplicitPublish: QuartzFilterPlugin = () => ({
  name: "ExplicitPublish",
  shouldPublish(_ctx, [_tree, vfile]) {
    return vfile.data?.frontmatter?.publish === true || vfile.data?.frontmatter?.publish === "true"
  },
})
