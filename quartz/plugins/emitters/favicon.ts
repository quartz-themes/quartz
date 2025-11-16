import sharp from "sharp"
import { FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"

export const Favicon: QuartzEmitterPlugin = () => ({
  name: "Favicon",
  async *emit(ctx) {
    const { utils } = ctx
    const iconPath = utils!.path.join(utils!.path.QUARTZ, "static", "icon.png")

    const faviconContent = sharp(iconPath).resize(48, 48).toFormat("png")

    yield write({
      ctx,
      slug: "favicon" as FullSlug,
      ext: ".ico",
      content: faviconContent,
    })
  },
  async *partialEmit() {},
})
