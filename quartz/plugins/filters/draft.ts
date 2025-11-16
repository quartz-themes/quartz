import { QuartzFilterPlugin } from "../types"

/**
 * @plugin RemoveDrafts
 * @category Filter
 *
 * @reads vfile.data.frontmatter.draft
 *
 * @dependencies None
 */
export const RemoveDrafts: QuartzFilterPlugin<{}> = () => ({
  name: "RemoveDrafts",
  shouldPublish(_ctx, [_tree, vfile]) {
    const draftFlag: boolean =
      vfile.data?.frontmatter?.draft === true || vfile.data?.frontmatter?.draft === "true"
    return !draftFlag
  },
})
