/**
 * Médias et textes de départ des sections narratives (stories vidéo, vidéo immersive, visuel éditorial,
 * vue éclatée, tableau comparatif, à propos, étapes au défilement) : chaque emplacement reçoit le média
 * du projet le plus adapté (photo détourée pour la vue éclatée, photo de détail pour le zoom, vidéos pour les stories),
 * et la section « À propos » reprend les textes déjà rédigés pour la page « Notre histoire » de la marque.
 * Seuls les champs vides sont complétés.
 */
import type { SectionSchema, ThemeSpec } from "./spec";

type Blocks = { type: string; settings?: Record<string, unknown> }[];
type Pools = { cutout: string[]; photos: string[]; life: string[]; videos: string[]; posters: string[] };

export const NARRATIVE_MEDIA_TYPES = new Set(["video-stories", "immersive-video", "editorial-visual", "exploded-view", "comparison-table", "about", "scroll-steps"]);

/** Affiche associée à une vidéo du projet (même ordre : vidéo principale, puis reels). */
function posterFor(p: Pools, video: string): string | undefined {
  const i = p.videos.indexOf(video);
  const reel = video.match(/^es-reel-(\d+)/);
  return (reel && p.posters.find((f) => f.startsWith(`es-reel-affiche-${reel[1]}`))) || (/^es-video-/.test(video) && p.posters.find((f) => f.startsWith("es-video-affiche"))) || p.posters[i] || p.posters[0];
}

/** Textes de la page « Notre histoire » générée pour la marque (sections rich-text et features-grid). */
function brandAbout(spec: ThemeSpec) {
  const t = spec.templates["page.about"];
  if (!t) return { values: [] as { title: string; text?: string; icon?: string }[] };
  const sections = t.order.map((id) => t.sections[id]).filter(Boolean) as { type: string; settings?: Record<string, unknown>; blocks?: Record<string, { type: string; settings?: Record<string, unknown> }>; block_order?: string[] }[];
  const blocksOf = (s: (typeof sections)[number]) => (s.block_order ?? Object.keys(s.blocks ?? {})).map((k) => s.blocks?.[k]).filter(Boolean) as { type: string; settings?: Record<string, unknown> }[];
  const rich = sections.find((s) => s.type === "rich-text");
  const rb = rich ? blocksOf(rich) : [];
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const features = sections.find((s) => s.type === "features-grid");
  const values = (features ? blocksOf(features) : [])
    .filter((b) => b.type === "feature" && str(b.settings?.title))
    .map((b) => ({ title: str(b.settings?.title)!, text: str(b.settings?.text), icon: str(b.settings?.icon) }));
  return {
    eyebrow: str(rb.find((b) => b.type === "eyebrow")?.settings?.text),
    heading: str(rb.find((b) => b.type === "heading")?.settings?.text),
    lead: str(rb.find((b) => b.type === "text")?.settings?.text),
    valuesTitle: str(features?.settings?.heading),
    values,
  };
}

export function narrativeProjectMedia(spec: ThemeSpec, type: string, schema: SectionSchema, p: Pools, settings: Record<string, unknown>, blocks?: Blocks): { settings: Record<string, unknown>; blocks?: Blocks } {
  const out = { ...settings };
  // Une même photo peut exister sous deux noms (scène et bannière) : on ne la garde qu'une fois.
  const key = (f: string) => f.replace(/^.*-([a-z0-9]{6})\.\w+$/, "$1");
  const photos = (p.photos.length ? p.photos : p.cutout).filter((f, i, a) => a.findIndex((x) => key(x) === key(f)) === i);
  const details = [...photos.filter((f) => /detail/.test(f)), ...photos.filter((f) => /packshot/.test(f))];
  let n = 0;
  const photo = () => (photos.length ? photos[n++ % photos.length] : undefined);
  const set = (o: Record<string, unknown>, id: string, val: unknown) => {
    if (val !== undefined && val !== "" && !o[id]) o[id] = val;
  };
  const preset = ((schema.presets?.[0] as { blocks?: Blocks } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
  let list = (blocks ?? preset).map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));

  switch (type) {
    case "video-stories": {
      // Une vidéo par story (en boucle sur les vidéos du projet), une photo différente dans chaque cercle.
      let v = 0;
      list = list.map((b) => {
        const s = b.settings;
        const video = p.videos.length ? p.videos[v++ % p.videos.length] : undefined;
        set(s, "video_asset", video);
        if (video) set(s, "poster_asset", posterFor(p, video));
        set(s, "image_asset", photo());
        return b;
      });
      break;
    }
    case "immersive-video": {
      const video = p.videos[0];
      set(out, "video_asset", video);
      set(out, "poster_asset", video ? posterFor(p, video) : p.life[0] ?? photo());
      break;
    }
    case "editorial-visual": {
      set(out, "image_asset", p.life[0] ?? photo());
      set(out, "detail_asset", details[0] ?? photos.find((f) => f !== out.image_asset) ?? p.cutout[0]);
      break;
    }
    case "exploded-view": {
      set(out, "image_asset", p.cutout[0] ?? details[0] ?? photo());
      break;
    }
    case "comparison-table": {
      // Seule la colonne mise en avant (le produit de la boutique) reçoit une image : la photo détourée.
      list = list.map((b) => {
        if (b.type === "column" && b.settings.highlight) set(b.settings, "image_asset", p.cutout[0] ?? details[0]);
        return b;
      });
      break;
    }
    case "about": {
      set(out, "image_asset", p.life[0] ?? photo());
      const a = brandAbout(spec);
      if (a.heading && !out.heading) {
        out.heading = a.heading;
        out.heading_accent = out.heading_accent ?? "";
      }
      set(out, "eyebrow", a.eyebrow);
      set(out, "lead", a.lead);
      set(out, "values_title", a.valuesTitle);
      if (!blocks && a.values.length >= 2) {
        const icons = ["heart", "leaf", "hand", "star"];
        list = a.values.slice(0, 4).map((v, i) => ({ type: "value", settings: { icon: v.icon && v.icon !== "none" ? v.icon : icons[i % icons.length], title: v.title, ...(v.text ? { text: v.text } : {}) } }));
      }
      break;
    }
    case "scroll-steps": {
      // Une photo par étape ; la vidéo principale du projet illustre la dernière étape.
      list = list.map((b, i) => {
        set(b.settings, "image_asset", photo());
        if (i === list.length - 1 && list.length > 1) set(b.settings, "video_asset", p.videos[0]);
        return b;
      });
      break;
    }
  }
  return { settings: out, blocks: list.length ? list : blocks };
}
