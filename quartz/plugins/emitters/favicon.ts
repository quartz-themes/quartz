import sharp from "sharp"
import { QUARTZ, FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"

export const Favicon: QuartzEmitterPlugin = () => ({
  name: "Favicon",
  async *emit(ctx) {
    const { argv, utils } = ctx
    const iconPath = utils!.path.join(QUARTZ, "static", "icon.png")

    const faviconContent = sharp(iconPath).resize(48, 48).toFormat("png")

    yield write({
      ctx: { argv, utils } as BuildCtx,
      slug: "favicon" as FullSlug,
      ext: ".ico",
      content: faviconContent,
    })
  },
  async *partialEmit() {},
})
