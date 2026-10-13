import { z } from "zod";
import { body, handle, ok, readForm } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { addTrack, listTracks, MUSIC_MAX_BYTES, removeTrack, updateTrack } from "@/lib/music-library";
import { SONG_STYLES, type SongStyle } from "@/lib/media/song";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

const styles = z.array(z.enum(SONG_STYLES)).max(SONG_STYLES.length);
const mood = z.enum(["calm", "pulse", "warm"]);

/** Bibliothèque musicale du studio (morceaux déposés par le propriétaire, avec leur licence). */
export const GET = handle(async () => {
  await requireAdmin();
  return ok({ tracks: listTracks().map(({ key: _k, ...t }) => t) });
});

/** Dépose un morceau : fichier audio (MP3, OGG, WAV, FLAC, M4A ; 30 Mo au plus), titre, artiste, licence, styles. */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const form = await readForm(req, MUSIC_MAX_BYTES + 1048576);
  const f = form.get("file");
  if (!f || typeof f === "string" || !f.size) throw new HttpError(400, L("Choisissez un fichier audio.", "Choose an audio file."));
  if (f.size > MUSIC_MAX_BYTES) throw new HttpError(413, L("Le fichier dépasse 30 Mo.", "The file exceeds 30 MB."));
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const st = styles.safeParse(text("styles").split(",").map((x) => x.trim()).filter(Boolean));
  const md = mood.safeParse(text("mood") || "pulse");
  try {
    const t = await addTrack(new Uint8Array(await f.arrayBuffer()), {
      title: text("title") || (f.name || "").replace(/\.[a-z0-9]+$/i, ""),
      artist: text("artist"),
      license: text("license"),
      sourceUrl: text("sourceUrl"),
      styles: st.success ? (st.data as SongStyle[]) : [],
      mood: md.success ? md.data : "pulse",
    });
    const { key: _k, ...pub } = t;
    return ok({ track: pub });
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
});

/** Modifie un morceau (titre, artiste, licence, lien, styles, humeur, actif). */
export const PATCH = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, z.object({ id: z.string().min(1).max(40), title: z.string().max(120).optional(), artist: z.string().max(120).optional(), license: z.string().max(200).optional(), sourceUrl: z.string().max(300).optional(), styles: styles.optional(), mood: mood.optional(), enabled: z.boolean().optional() }));
  try {
    const { id, ...patch } = b;
    const { key: _k, ...pub } = updateTrack(id, patch);
    return ok({ track: pub });
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
});

export const DELETE = handle(async (req: Request) => {
  await requireAdmin();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) throw new HttpError(400, L("Morceau manquant.", "Missing track."));
  removeTrack(id);
  return ok();
});
