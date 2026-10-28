import { z } from "zod";
import { L10n } from "./schema";

export const ImageEntry = z.object({
  alt: L10n,
  width: z.number().int(),
  height: z.number().int(),
  /** widths generated in /public/images/<slug>-<w>.(avif|webp|jpg) */
  widths: z.array(z.number().int()).min(1),
  /** tiny base64 placeholder shown while the photo loads */
  blur: z.string(),
  /** CSS object-position for crops */
  position: z.string().optional(),
});
export type ImageEntry = z.infer<typeof ImageEntry>;
export const ImageManifest = z.record(z.string(), ImageEntry);
