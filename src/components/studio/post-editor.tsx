"use client";
/** Éditeur d'une publication : texte, médias, compte, date et actions. */
import { useEffect, useState } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CalendarClock, Copy, ExternalLink, ImagePlus, RefreshCw, Send, Trash2, X, Ban, Check } from "lucide-react";
import { api, Badge, Button, cx, Field, Input, Modal, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, MediaPicker, type AssetView } from "./common";

export type PostView = { id: string; network: string; format: string; status: string; scheduledAt: number | null; timezone: string; title: string; caption: string; hashtags: string; link: string | null; angle: string | null; media: AssetView[]; connectionId: string | null; connectionName: string | null; error: string | null; remoteUrl: string | null; publishedAt: number | null; autoApproved: boolean };

export const POST_STATUS: Record<string, { label: string; tone: any }> = {
  draft: { label: "Brouillon", tone: "neutral" },
  generating: { label: "En création", tone: "info" },
  review: { label: "À valider", tone: "warn" },
  scheduled: { label: "Programmé", tone: "ok" },
  publishing: { label: "En publication", tone: "info" },
  published: { label: "Publié", tone: "ink" },
  failed: { label: "Échec", tone: "bad" },
  cancelled: { label: "Annulé", tone: "neutral" },
};
export const NETWORKS: Record<string, { label: string; color: string; formats: [string, string][]; limit: number }> = {
  instagram: { label: "Instagram", color: "#E1306C", formats: [["image", "Image"], ["carousel", "Carrousel"], ["reel", "Reel"], ["story", "Story"]], limit: 2200 },
  facebook: { label: "Facebook", color: "#1877F2", formats: [["text", "Texte"], ["image", "Image"], ["carousel", "Plusieurs images"], ["video", "Vidéo"]], limit: 63206 },
  tiktok: { label: "TikTok", color: "#111111", formats: [["video", "Vidéo"]], limit: 2200 },
  youtube: { label: "YouTube", color: "#FF0000", formats: [["short", "Short"], ["video", "Vidéo"]], limit: 5000 },
  pinterest: { label: "Pinterest", color: "#E60023", formats: [["pin", "Épingle"]], limit: 800 },
};

export function NetworkDot({ network }: { network: string }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: NETWORKS[network]?.color ?? "#999" }} aria-hidden />;
}

export function PostEditor({ post, onClose, onChanged }: { post: PostView | null; onClose: () => void; onChanged: () => void }) {
  const { id: projectId, data: project } = useProject();
  const toast = useToast();
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
      toast("ok", post.status === "scheduled" ? "Modifié : la publication repasse « à valider »." : "Publication enregistrée.");
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
      await api(`/api/posts/${f.id}`, { body: { action: a, ...extra } });
      toast("ok", { approve: "Validée et programmée.", schedule: "Programmée.", unschedule: "Déprogrammée.", cancel: "Annulée.", duplicate: "Dupliquée (lendemain, en brouillon).", regenerate: "Régénération en cours.", publish_now: "Publication en cours d'envoi." }[a] ?? "Fait.");
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
    <Modal open onClose={onClose} title={`${NETWORKS[f.network]?.label ?? f.network} · ${POST_STATUS[f.status]?.label ?? f.status}`} wide>
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="grid content-start gap-4">
          {f.error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{f.error}</p>}
          {f.remoteUrl && <a href={f.remoteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-signal underline"><ExternalLink className="size-4" /> Voir la publication en ligne</a>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Réseau" htmlFor="pnet">
              <Select id="pnet" value={f.network} disabled={locked} onChange={(e) => setF({ ...f, network: e.target.value, format: NETWORKS[e.target.value].formats[0][0], connectionId: null })}>
                {Object.entries(NETWORKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label="Format" htmlFor="pfmt">
              <Select id="pfmt" value={f.format} disabled={locked} onChange={(e) => setF({ ...f, format: e.target.value })}>
                {(NETWORKS[f.network]?.formats ?? []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Compte" htmlFor="pacc" hint={accounts.length ? undefined : "Aucun compte connecté pour ce réseau."}>
              <Select id="pacc" value={f.connectionId ?? ""} disabled={locked} onChange={(e) => setF({ ...f, connectionId: e.target.value || null })}>
                <option value="">Choisir…</option>
                {accounts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status !== "active" ? " (à reconnecter)" : ""}</option>)}
              </Select>
            </Field>
          </div>
          {(f.network === "youtube" || f.network === "pinterest") && <Field label="Titre" htmlFor="ptitle"><Input id="ptitle" value={f.title} disabled={locked} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={100} /></Field>}
          <Field label="Légende" htmlFor="pcap" hint={`${fullLength} / ${limit} caractères`} error={fullLength > limit ? "Trop long pour ce réseau." : null}>
            <Textarea id="pcap" rows={7} value={f.caption} disabled={locked} onChange={(e) => setF({ ...f, caption: e.target.value })} />
          </Field>
          <Field label="Hashtags (sans #, séparés par des espaces)" htmlFor="ptags"><Input id="ptags" value={f.hashtags} disabled={locked} onChange={(e) => setF({ ...f, hashtags: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Date et heure (${tz})`} htmlFor="pdate"><Input id="pdate" type="datetime-local" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Lien" htmlFor="plink"><Input id="plink" value={f.link ?? ""} disabled={locked} onChange={(e) => setF({ ...f, link: e.target.value || null })} placeholder="https://" /></Field>
          </div>
          {!locked && (
            <div className="rounded-2xl bg-paper-2 p-3">
              <p className="text-xs font-medium">Régénérer avec l'IA</p>
              <div className="mt-2 flex gap-2">
                <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Consigne (facultatif) : plus court, plus pédagogique…" className="h-9 text-sm" />
                <Button size="sm" variant="secondary" icon={<RefreshCw className="size-3.5" />} loading={busy === "regenerate"} onClick={() => action("regenerate", { instruction, part: "text" })}>Texte</Button>
                <Button size="sm" variant="secondary" icon={<RefreshCw className="size-3.5" />} onClick={() => action("regenerate", { instruction, part: "media" })}>Visuel</Button>
              </div>
            </div>
          )}
        </div>
        <div className="grid content-start gap-3">
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs">
              <NetworkDot network={f.network} /> <span className="font-medium">{project?.brand?.name ?? "Votre compte"}</span>
            </div>
            {f.media[0] ? (
              f.media[0].kind === "video" ? <video src={f.media[0].url} controls playsInline className="aspect-[9/16] w-full bg-black object-cover" /> : <img src={f.media[0].thumbUrl ?? f.media[0].url} alt="" className="w-full" />
            ) : (
              <div className="grid aspect-square place-items-center bg-paper-2 text-xs text-muted">Sans média</div>
            )}
            <p className="line-clamp-4 whitespace-pre-wrap px-3 py-2 text-xs">{f.caption}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {f.media.map((m) => (
              <span key={m.id} className="relative">
                <AssetThumb a={m} className="size-14 rounded-xl" />
                {!locked && <button onClick={() => setF({ ...f, media: f.media.filter((x) => x.id !== m.id) })} className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-ink text-paper" aria-label="Retirer"><X className="size-3" /></button>}
              </span>
            ))}
            {!locked && <button onClick={() => setPicker(true)} className="grid size-14 place-items-center rounded-xl border border-dashed border-line hover:border-ink" aria-label="Ajouter un média"><ImagePlus className="size-4" /></button>}
          </div>
          {f.autoApproved && <Badge tone="info">Programmée par vos règles d'automatisation</Badge>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
        {!locked && <Button onClick={save} loading={busy === "save"} variant="secondary">Enregistrer</Button>}
        {!locked && f.status !== "scheduled" && <Button onClick={() => action("approve")} loading={busy === "approve"} icon={<Check className="size-4" />}>Valider et programmer</Button>}
        {f.status === "scheduled" && <Button onClick={() => action("unschedule")} variant="secondary" icon={<CalendarClock className="size-4" />}>Déprogrammer</Button>}
        {!locked && <Button onClick={() => { if (confirm("Publier maintenant sur le compte choisi ?")) action("publish_now"); }} variant="signal" icon={<Send className="size-4" />} loading={busy === "publish_now"}>Publier maintenant</Button>}
        <Button onClick={() => action("duplicate")} variant="ghost" icon={<Copy className="size-4" />}>Dupliquer</Button>
        {!locked && f.status !== "cancelled" && <Button onClick={() => action("cancel")} variant="ghost" icon={<Ban className="size-4" />}>Annuler</Button>}
        {f.status !== "publishing" && (
          <Button
            variant="danger"
            icon={<Trash2 className="size-4" />}
            className="ml-auto"
            onClick={async () => {
              if (!confirm(f.status === "published" ? "Supprimer du calendrier ? (la publication reste en ligne sur le réseau)" : "Supprimer cette publication ?")) return;
              await api(`/api/posts/${f.id}`, { method: "DELETE" });
              onChanged();
              onClose();
            }}
          >
            Supprimer
          </Button>
        )}
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} multiple kinds={["image", "video"]} onPick={(a) => setF({ ...f, media: [...f.media, ...a].slice(0, 10) })} />
    </Modal>
  );
}
