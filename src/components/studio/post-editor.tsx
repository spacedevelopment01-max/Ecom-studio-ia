"use client";
/** Éditeur d'une publication : texte, médias, compte, date et actions. */
import { useEffect, useState } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CalendarClock, Copy, ExternalLink, ImagePlus, RefreshCw, Send, Trash2, X, Ban, Check } from "lucide-react";
import { api, Badge, Button, cx, Field, Input, Modal, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, MediaPicker, type AssetView } from "./common";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";

export type PostView = { id: string; network: string; format: string; status: string; scheduledAt: number | null; timezone: string; title: string; caption: string; hashtags: string; link: string | null; angle: string | null; media: AssetView[]; connectionId: string | null; connectionName: string | null; error: string | null; remoteUrl: string | null; publishedAt: number | null; autoApproved: boolean; advice?: string[] };

/** Statuts d'une publication : `label` (français) et `en` (anglais) ; choisir avec t(s.label, s.en). */
export const POST_STATUS: Record<string, { label: string; en: string; tone: any }> = {
  draft: { label: "Brouillon", en: "Draft", tone: "neutral" },
  generating: { label: "En création", en: "Generating", tone: "info" },
  review: { label: "À valider", en: "To review", tone: "warn" },
  scheduled: { label: "Programmé", en: "Scheduled", tone: "ok" },
  publishing: { label: "En publication", en: "Publishing", tone: "info" },
  published: { label: "Publié", en: "Published", tone: "ink" },
  failed: { label: "Échec", en: "Failed", tone: "bad" },
  cancelled: { label: "Annulé", en: "Cancelled", tone: "neutral" },
};
/** Réseaux : `label` = nom de marque (identique dans les deux langues) ; formats [valeur, libellé FR, libellé EN]. */
export const NETWORKS: Record<string, { label: string; color: string; formats: [string, string, string][]; limit: number }> = {
  instagram: { label: "Instagram", color: "#E1306C", formats: [["image", "Image", "Image"], ["carousel", "Carrousel", "Carousel"], ["reel", "Reel", "Reel"], ["story", "Story", "Story"]], limit: 2200 },
  facebook: { label: "Facebook", color: "#1877F2", formats: [["text", "Texte", "Text"], ["image", "Image", "Image"], ["carousel", "Plusieurs images", "Multiple images"], ["video", "Vidéo", "Video"]], limit: 63206 },
  tiktok: { label: "TikTok", color: "#111111", formats: [["video", "Vidéo", "Video"]], limit: 2200 },
  youtube: { label: "YouTube", color: "#FF0000", formats: [["short", "Short", "Short"], ["video", "Vidéo", "Video"]], limit: 5000 },
  pinterest: { label: "Pinterest", color: "#E60023", formats: [["pin", "Épingle", "Pin"]], limit: 800 },
};

export function NetworkDot({ network }: { network: string }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: NETWORKS[network]?.color ?? "#999" }} aria-hidden />;
}

export function PostEditor({ post, onClose, onChanged }: { post: PostView | null; onClose: () => void; onChanged: () => void }) {
  const { id: projectId, data: project } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const tz = post?.timezone ?? project?.settings.timezone ?? "Europe/Paris";
  const [f, setF] = useState<PostView | null>(post);
  const [date, setDate] = useState("");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const { data: conns } = useApi<{ connections: { id: string; provider: string; name: string; status: string; linked: boolean }[] }>(post ? `/api/connections?project=${projectId}` : null);
  useEffect(() => {
    setF(post);
    setDate(post?.scheduledAt ? formatInTimeZone(new Date(post.scheduledAt), tz, "yyyy-MM-dd'T'HH:mm") : "");
  }, [post, tz]);
  if (!post || !f) return null;
  const locked = f.status === "published" || f.status === "publishing";
  const accounts = (conns?.connections ?? []).filter((c) => c.provider === f.network);
  const save = async () => {
    setBusy("save");
    try {
      await api(`/api/posts/${f.id}`, { method: "PATCH", body: { title: f.title, caption: f.caption, hashtags: f.hashtags, media: f.media.map((m) => m.id), scheduledAt: date ? fromZonedTime(date, tz).getTime() : null, connectionId: f.connectionId, network: f.network, format: f.format, link: f.link } });
      toast("ok", post.status === "scheduled" ? t("Modifié : la publication repasse « à valider ».", "Updated: the post is back to \"to review\".") : t("Publication enregistrée.", "Post saved."));
      onChanged();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const action = async (a: string, extra: Record<string, unknown> = {}) => {
    setBusy(a);
    try {
      if (a !== "duplicate" && a !== "regenerate" && !locked) await api(`/api/posts/${f.id}`, { method: "PATCH", body: { title: f.title, caption: f.caption, hashtags: f.hashtags, media: f.media.map((m) => m.id), scheduledAt: date ? fromZonedTime(date, tz).getTime() : null, connectionId: f.connectionId, link: f.link } });
      await api(`/api/posts/${f.id}`, { body: { action: a, ...extra }, lang: a === "regenerate" ? cl.lang : undefined });
      toast("ok", t<Record<string, string>>({ approve: "Validée et programmée.", schedule: "Programmée.", unschedule: "Déprogrammée.", cancel: "Annulée.", duplicate: "Dupliquée (lendemain, en brouillon).", regenerate: "Régénération en cours.", publish_now: "Publication en cours d'envoi." }, { approve: "Approved and scheduled.", schedule: "Scheduled.", unschedule: "Unscheduled.", cancel: "Cancelled.", duplicate: "Duplicated (next day, as a draft).", regenerate: "Regenerating.", publish_now: "Sending the post." })[a] ?? t("Fait.", "Done."));
      onChanged();
      if (a !== "regenerate") onClose();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const limit = NETWORKS[f.network]?.limit ?? 2200;
  const fullLength = f.caption.length + (f.hashtags ? f.hashtags.split(/\s+/).filter(Boolean).length * 2 + f.hashtags.length : 0);
  return (
    <Modal open onClose={onClose} title={`${NETWORKS[f.network]?.label ?? f.network} · ${POST_STATUS[f.status] ? t(POST_STATUS[f.status].label, POST_STATUS[f.status].en) : f.status}`} wide>
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="grid content-start gap-4">
          {f.error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{f.error}</p>}
          {f.remoteUrl && <a href={f.remoteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-signal underline"><ExternalLink className="size-4" /> {t("Voir la publication en ligne", "View the live post")}</a>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("Réseau", "Network")} htmlFor="pnet">
              <Select id="pnet" value={f.network} disabled={locked} onChange={(e) => setF({ ...f, network: e.target.value, format: NETWORKS[e.target.value].formats[0][0], connectionId: null })}>
                {Object.entries(NETWORKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label={t("Format", "Format")} htmlFor="pfmt">
              <Select id="pfmt" value={f.format} disabled={locked} onChange={(e) => setF({ ...f, format: e.target.value })}>
                {(NETWORKS[f.network]?.formats ?? []).map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}
              </Select>
            </Field>
            <Field label={t("Compte", "Account")} htmlFor="pacc" hint={accounts.length ? undefined : t("Aucun compte connecté pour ce réseau.", "No account connected for this network.")}>
              <Select id="pacc" value={f.connectionId ?? ""} disabled={locked} onChange={(e) => setF({ ...f, connectionId: e.target.value || null })}>
                <option value="">{t("Choisir…", "Choose…")}</option>
                {accounts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status !== "active" ? t(" (à reconnecter)", " (reconnect)") : ""}</option>)}
              </Select>
            </Field>
          </div>
          {(f.network === "youtube" || f.network === "pinterest") && <Field label={t("Titre", "Title")} htmlFor="ptitle"><Input id="ptitle" value={f.title} disabled={locked} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={100} /></Field>}
          <Field label={t("Légende", "Caption")} htmlFor="pcap" hint={`${fullLength} / ${limit} ${t("caractères", "characters")}`} error={fullLength > limit ? t("Trop long pour ce réseau.", "Too long for this network.") : null}>
            <Textarea id="pcap" rows={7} value={f.caption} disabled={locked} onChange={(e) => setF({ ...f, caption: e.target.value })} />
          </Field>
          {!locked && post.advice?.length ? (
            <div className="rounded-2xl bg-paper-2 px-4 py-3 text-xs">
              <p className="font-medium">{t("Relecture du studio", "Studio review")}</p>
              <ul className="mt-1 list-disc pl-4 text-muted">{post.advice.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          ) : null}
          <Field label={t("Hashtags (sans #, séparés par des espaces)", "Hashtags (without #, separated by spaces)")} htmlFor="ptags"><Input id="ptags" value={f.hashtags} disabled={locked} onChange={(e) => setF({ ...f, hashtags: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t(`Date et heure (${tz})`, `Date and time (${tz})`)} htmlFor="pdate"><Input id="pdate" type="datetime-local" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label={t("Lien", "Link")} htmlFor="plink"><Input id="plink" value={f.link ?? ""} disabled={locked} onChange={(e) => setF({ ...f, link: e.target.value || null })} placeholder="https://" /></Field>
          </div>
          {!locked && (
            <div className="rounded-2xl bg-paper-2 p-3">
              <p className="text-xs font-medium">{t("Régénérer avec l'IA", "Regenerate with AI")}</p>
              <ContentLangPicker {...cl} className="mt-2" />
              <div className="mt-2 flex gap-2">
                <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={t("Consigne (facultatif) : plus court, plus pédagogique…", "Instructions (optional): shorter, more educational…")} className="h-9 text-sm" />
                <Button size="sm" variant="secondary" icon={<RefreshCw className="size-3.5" />} loading={busy === "regenerate"} onClick={() => action("regenerate", { instruction, part: "text" })}>{t("Texte", "Text")}</Button>
                <Button size="sm" variant="secondary" icon={<RefreshCw className="size-3.5" />} onClick={() => action("regenerate", { instruction, part: "media" })}>{t("Visuel", "Visual")}</Button>
              </div>
            </div>
          )}
        </div>
        <div className="grid content-start gap-3">
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs">
              <NetworkDot network={f.network} /> <span className="font-medium">{project?.brand?.name ?? t("Votre compte", "Your account")}</span>
            </div>
            {f.media[0] ? (
              f.media[0].kind === "video" ? <video src={f.media[0].url} poster={f.media[0].thumbUrl ?? undefined} controls playsInline preload="metadata" className="aspect-[9/16] w-full bg-black object-cover" /> : <img src={f.media[0].thumbUrl ?? f.media[0].url} alt="" className="w-full" />
            ) : (
              <div className="grid aspect-square place-items-center bg-paper-2 text-xs text-muted">{t("Sans média", "No media")}</div>
            )}
            <p className="line-clamp-4 whitespace-pre-wrap px-3 py-2 text-xs">{f.caption}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {f.media.map((m) => (
              <span key={m.id} className="relative">
                <AssetThumb a={m} className="size-14 rounded-xl" />
                {!locked && <button onClick={() => setF({ ...f, media: f.media.filter((x) => x.id !== m.id) })} className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-ink text-paper" aria-label={t("Retirer", "Remove")}><X className="size-3" /></button>}
              </span>
            ))}
            {!locked && <button onClick={() => setPicker(true)} className="grid size-14 place-items-center rounded-xl border border-dashed border-line hover:border-ink" aria-label={t("Ajouter un média", "Add media")}><ImagePlus className="size-4" /></button>}
          </div>
          {f.autoApproved && <Badge tone="info">{t("Programmée par vos règles d'automatisation", "Scheduled by your automation rules")}</Badge>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
        {!locked && <Button onClick={save} loading={busy === "save"} variant="secondary">{t("Enregistrer", "Save")}</Button>}
        {!locked && f.status !== "scheduled" && <Button onClick={() => action("approve")} loading={busy === "approve"} icon={<Check className="size-4" />}>{t("Valider et programmer", "Approve and schedule")}</Button>}
        {f.status === "scheduled" && <Button onClick={() => action("unschedule")} variant="secondary" icon={<CalendarClock className="size-4" />}>{t("Déprogrammer", "Unschedule")}</Button>}
        {!locked && <Button onClick={() => { if (confirm(t("Publier maintenant sur le compte choisi ?", "Publish now to the selected account?"))) action("publish_now"); }} variant="signal" icon={<Send className="size-4" />} loading={busy === "publish_now"}>{t("Publier maintenant", "Publish now")}</Button>}
        <Button onClick={() => action("duplicate")} variant="ghost" icon={<Copy className="size-4" />}>{t("Dupliquer", "Duplicate")}</Button>
        {!locked && f.status !== "cancelled" && <Button onClick={() => action("cancel")} variant="ghost" icon={<Ban className="size-4" />}>{t("Annuler", "Cancel")}</Button>}
        {f.status !== "publishing" && (
          <Button
            variant="danger"
            icon={<Trash2 className="size-4" />}
            className="ml-auto"
            onClick={async () => {
              if (!confirm(f.status === "published" ? t("Supprimer du calendrier ? (la publication reste en ligne sur le réseau)", "Remove from the calendar? (the post stays live on the network)") : t("Supprimer cette publication ?", "Delete this post?"))) return;
              await api(`/api/posts/${f.id}`, { method: "DELETE" });
              onChanged();
              onClose();
            }}
          >
            {t("Supprimer", "Delete")}
          </Button>
        )}
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} multiple kinds={["image", "video"]} onPick={(a) => setF({ ...f, media: [...f.media, ...a].slice(0, 10) })} />
    </Modal>
  );
}
