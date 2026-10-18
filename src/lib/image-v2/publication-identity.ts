/** Current editable colours/fonts override the snapshot of the chosen direction; its language/rules stay intact. */
import type { Project } from "../projects";
import { effectivePalette } from "../route-palette";
export function publicationIdentity(p: Project) {
  const b = p.brand;
  if (!b) return null;
  const palette = effectivePalette(b) ?? b.palette;
  const fonts = b.fonts ?? b.artIdentity?.fonts;
  return {
    ...b,
    palette,
    fonts,
    artIdentity: b.artIdentity
      ? { ...b.artIdentity, palette, fonts: fonts ?? b.artIdentity.fonts }
      : undefined,
  };
}
