"use client";
/**
 * Administration › Musiques : la bibliothèque musicale du studio. Le propriétaire dépose les morceaux qu'il a
 * choisis (téléchargés depuis la page officielle de l'artiste), avec leur licence, et les classe par style ; les
 * vidéos des clients les prennent en premier, selon le produit ou le métier.
 */
import { useRef, useState } from "react";
import { Music, Trash2, Upload } from "lucide-react";
import { api, Badge, Button, Card, Field, Input, Select, Toggle, useApi, useToast } from "./ui";
import { useT } from "./i18n";
import { SONG_STYLES, SONG_STYLE_LABELS, type SongStyle } from "@/lib/media/song-styles";
import type { LibraryTrack } from "@/lib/music-library";

type Track = Omit<LibraryTrack, "key">;
const MOODS = [
  ["pulse", "Entraînant", "Upbeat"],
  ["warm", "Chaleureux", "Warm"],
  ["calm", "Calme", "Calm"],
] as const;

const duration = (s: number) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s`;

export function MusicLibraryAdmin() {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<{ tracks: Track[] }>("/api/admin/music");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", artist: "", license: "", sourceUrl: "", mood: "pulse" });
  const [styles, setStyles] = useState<SongStyle[]>([]);
  const [busy, setBusy] = useState(false);
  const label = (s: SongStyle) => t(SONG_STYLE_LABELS[s].fr, SONG_STYLE_LABELS[s].en);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast("bad", t("Choisissez un fichier audio.", "Choose an audio file."));
    if (!form.license.trim()) return toast("bad", t("Indiquez la licence du morceau.", "Enter the track's license."));
    const fd = new FormData();
    fd.set("file", file);
    for (const [k, v] of Object.entries(form)) fd.set(k, v);
    fd.set("styles", styles.join(","));
    setBusy(true);
    try {
      await api("/api/admin/music", { form: fd });
      toast("ok", t("Morceau ajouté à la bibliothèque.", "Track added to the library."));
      setForm({ title: "", artist: "", license: "", sourceUrl: "", mood: form.mood });
      setStyles([]);
      if (fileRef.current) fileRef.current.value = "";
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const patch = async (id: string, b: Record<string, unknown>) => {
    try {
      await api("/api/admin/music", { method: "PATCH", body: { id, ...b } });
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const remove = async (tr: Track) => {
    if (!confirm(t(`Retirer « ${tr.title} » de la bibliothèque ?`, `Remove "${tr.title}" from the library?`))) return;
    try {
      await api(`/api/admin/music?id=${encodeURIComponent(tr.id)}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const toggleStyle = (list: SongStyle[], s: SongStyle) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);

  return (
    <div className="grid gap-5">
      <Card className="p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Music className="size-5" /> {t("Bibliothèque musicale", "Music library")}</h2>
        <p className="mt-2 text-sm text-ink-2">
          {t(
            "Les vidéos des clients prennent d'abord ces morceaux, selon le style du produit ou du métier ; à défaut, la banque Openverse, puis la musique composée par le studio.",
            "Client videos use these tracks first, matched to the product's or trade's style; otherwise the Openverse library, then the studio's own composed music.",
          )}
        </p>
        <p className="mt-2 rounded-2xl bg-paper-2 p-3 text-sm">
          {t(
            "Téléchargez chaque morceau depuis la page officielle de l'artiste (jamais depuis une vidéo YouTube) et vérifiez que sa licence autorise un usage commercial dans des publicités ; notez la mention demandée (ex. « CC BY 4.0 — crédit : … »).",
            "Download each track from the artist's official page (never from a YouTube video) and check its license allows commercial use in ads; note the required credit (e.g. “CC BY 4.0 — credit: …”).",
          )}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t("Fichier audio (MP3, OGG, WAV, FLAC, M4A — 30 Mo au plus)", "Audio file (MP3, OGG, WAV, FLAC, M4A — 30 MB max)")} htmlFor="music-file">
            <input id="music-file" ref={fileRef} type="file" accept="audio/*" className="block w-full rounded-xl border border-line bg-card px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-paper-2 file:px-3 file:py-1" />
          </Field>
          <Field label={t("Titre", "Title")} htmlFor="music-title"><Input id="music-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={t("Artiste", "Artist")} htmlFor="music-artist"><Input id="music-artist" value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} /></Field>
          <Field label={t("Licence (obligatoire)", "License (required)")} htmlFor="music-license"><Input id="music-license" placeholder="CC BY 4.0" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} /></Field>
          <Field label={t("Page d'origine (lien de l'artiste)", "Source page (artist link)")} htmlFor="music-url"><Input id="music-url" type="url" placeholder="https://" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></Field>
          <Field label={t("Ambiance", "Mood")} htmlFor="music-mood">
            <Select id="music-mood" value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
              {MOODS.map(([k, fr, en]) => <option key={k} value={k}>{t(fr, en)}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <div className="text-sm font-medium">{t("Styles où ce morceau convient", "Styles this track fits")}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SONG_STYLES.map((s) => (
              <button key={s} type="button" onClick={() => setStyles(toggleStyle(styles, s))} className={`rounded-full border px-3 py-1.5 text-sm ${styles.includes(s) ? "border-ink bg-ink text-paper" : "border-line bg-card"}`} aria-pressed={styles.includes(s)}>{label(s)}</button>
            ))}
          </div>
        </div>
        <div className="mt-4"><Button icon={<Upload className="size-4" />} loading={busy} onClick={upload}>{t("Ajouter le morceau", "Add track")}</Button></div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold">{t("Morceaux", "Tracks")} {data ? <span className="text-muted">({data.tracks.length})</span> : null}</h3>
        {!data ? <div className="skeleton mt-3 h-24 rounded-2xl" /> : data.tracks.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("Aucun morceau pour l'instant.", "No tracks yet.")}</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {data.tracks.map((tr) => (
              <li key={tr.id} className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{tr.title}{tr.artist ? <span className="text-ink-2"> — {tr.artist}</span> : null}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                      <Badge>{tr.license}</Badge>
                      <span>{duration(tr.durationS)}</span>
                      {tr.startS > 0 ? <span>· {t(`commence à ${tr.startS} s`, `starts at ${tr.startS} s`)}</span> : null}
                      {tr.sourceUrl ? <a className="underline" href={tr.sourceUrl} target="_blank" rel="noreferrer">{t("page d'origine", "source page")}</a> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle checked={tr.enabled} onChange={(v) => patch(tr.id, { enabled: v })} label={t("Actif", "Active")} />
                    <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => remove(tr)} aria-label={t("Retirer", "Remove")} />
                  </div>
                </div>
                <audio className="mt-3 w-full" controls preload="none" src={`/api/admin/music/${tr.id}`} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SONG_STYLES.map((s) => (
                    <button key={s} type="button" onClick={() => patch(tr.id, { styles: toggleStyle(tr.styles, s) })} className={`rounded-full border px-2.5 py-1 text-xs ${tr.styles.includes(s) ? "border-ink bg-ink text-paper" : "border-line bg-card"}`} aria-pressed={tr.styles.includes(s)}>{label(s)}</button>
                  ))}
                  <div className="w-40">
                    <Select className="h-8 py-0 text-xs" value={tr.mood} onChange={(e) => patch(tr.id, { mood: e.target.value })} aria-label={t("Ambiance", "Mood")}>
                      {MOODS.map(([k, fr, en]) => <option key={k} value={k}>{t(fr, en)}</option>)}
                    </Select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
