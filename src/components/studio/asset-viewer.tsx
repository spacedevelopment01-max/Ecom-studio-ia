"use client";
/** Visionneuse d'un média : aperçu, informations, versions, usages, actions. */
import Link from "next/link";
import { useState } from "react";
import { Check, Download, ExternalLink, Send, Store, X, Package } from "lucide-react";
import { api, Badge, Button, cx, formatBytes, formatDate, Modal, Select, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, ROLE_LABEL, StatusBadge, type AssetView } from "./common";

type Info = { asset: AssetView; usages: { target_type: string; target_id: string; label: string }[]; versions: AssetView[]; derived: AssetView[]; source: AssetView | null };

export function AssetViewer({ asset, onClose, onChanged }: { asset: AssetView | null; onClose: () => void; onChanged?: () => void }) {
  const { id: projectId, reload } = useProject();
  const toast = useToast();
  const { data, reload: reloadInfo } = useApi<Info>(asset ? `/api/files/${asset.id}?info=1` : null);
  const { data: theme } = useApi<any>(asset ? `/api/projects/${projectId}/theme` : null);
  const [target, setTarget] = useState("");
  if (!asset) return null;
  const a = data?.asset ?? asset;
  const status = async (s: string) => {
    await api(`/api/files/${a.id}`, { method: "PATCH", body: { status: s } });
    reloadInfo();
    onChanged?.();
  };
  const useInShop = async () => {
    if (!target) return;
    const [template, section] = target.split("|");
    try {
      await api(`/api/projects/${projectId}/theme/ops`, { body: { ops: [{ op: "use_media", template, section, key: a.kind === "video" ? "video" : "image", assetId: a.id }], summary: `Média « ${a.name} » placé dans la boutique` } });
      toast("ok", "Média placé dans la boutique (nouvelle version créée).");
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const toPost = async () => {
    try {
      await api(`/api/projects/${projectId}/posts`, { body: { network: a.kind === "video" ? "instagram" : "instagram", format: a.kind === "video" ? "reel" : "image", caption: "", media: [a.id] } });
      toast("ok", "Brouillon de publication créé avec ce média (espace Publications).");
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const canva = async (action: "send" | "import") => {
    try {
      await api(`/api/files/${a.id}/canva`, { body: { action, format: a.kind === "video" ? "mp4" : "png" } });
      toast("ok", action === "send" ? "Envoi vers Canva en cours : le lien d'édition apparaîtra ici." : "Récupération de l'export Canva en cours.");
      setTimeout(reloadInfo, 4000);
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const sections = (theme?.current?.structure ?? []).filter((t: any) => ["index", "product", "page.about"].includes(t.template)).flatMap((t: any) => t.sections.map((s: any) => ({ ...s, template: t.template })));
  return (
    <Modal open onClose={onClose} title={a.name} wide>
      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-2xl bg-paper-2">
          {a.kind === "video" ? (
            <video src={a.url} controls playsInline className="max-h-[70dvh] w-full bg-black" poster={a.thumbUrl ?? undefined} />
          ) : a.kind === "image" || a.kind === "logo" ? (
            <img src={a.url} alt={a.name} className="max-h-[70dvh] w-full object-contain" />
          ) : (
            <AssetThumb a={a} className="aspect-square w-full" />
          )}
        </div>
        <div className="grid content-start gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{ROLE_LABEL[a.role ?? ""] ?? a.kind}</Badge>
            <StatusBadge status={a.status} />
            {a.version > 1 && <Badge tone="info">version {a.version}</Badge>}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted">Dimensions</dt><dd>{a.width && a.height ? `${a.width} × ${a.height}` : "Inconnues"}</dd></div>
            <div><dt className="text-muted">Poids</dt><dd>{formatBytes(a.size)}</dd></div>
            {a.duration && <div><dt className="text-muted">Durée</dt><dd>{a.duration.toFixed(1)} s</dd></div>}
            <div><dt className="text-muted">Origine</dt><dd>{a.origin === "upload" ? "Importé" : a.origin === "generated" ? "Créé par le studio" : a.origin}</dd></div>
            <div className="col-span-2"><dt className="text-muted">Créé le</dt><dd>{formatDate(a.createdAt)}</dd></div>
            {a.meta?.recipe && <div className="col-span-2"><dt className="text-muted">Recette</dt><dd>{a.meta.recipe}{a.meta.provider ? ` · ${a.meta.provider}` : ""}</dd></div>}
            {a.meta?.delivered && <div className="col-span-2"><dt className="text-muted">Fichier livré</dt><dd>{a.meta.delivered}</dd></div>}
            {a.meta?.fidelity && <div className="col-span-2"><dt className="text-muted">Fidélité</dt><dd>{a.meta.fidelity}</dd></div>}
            {a.meta?.qc?.score !== undefined && <div className="col-span-2"><dt className="text-muted">Contrôle visuel</dt><dd>{a.meta.qc.sameProduct ? "Produit identique" : "Écart détecté"} · {a.meta.qc.score}/10</dd></div>}
            {a.meta?.qc?.fallback && <div className="col-span-2"><dt className="text-muted">Contrôle</dt><dd>Décor IA écarté ({a.meta.qc.fallback}) ; version studio utilisée.</dd></div>}
            {a.meta?.issues?.length > 0 && <div className="col-span-2"><dt className="text-muted">Points à vérifier</dt><dd>{a.meta.issues.join(" ; ")}</dd></div>}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={a.status === "approved" ? "primary" : "secondary"} icon={<Check className="size-4" />} onClick={() => status(a.status === "approved" ? "ready" : "approved")}>{a.status === "approved" ? "Validé" : "Valider"}</Button>
            <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={() => status("rejected")}>Écarter</Button>
            <a href={a.downloadUrl} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink"><Download className="size-3.5" /> Télécharger</a>
            {a.kind === "video" && <a href={`/api/files/${a.id}/capcut`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink"><Package className="size-3.5" /> Pack CapCut</a>}
          </div>
          {(a.kind === "image" || a.kind === "video") && (
            <div className="rounded-2xl border border-line p-3">
              <p className="text-xs font-medium">Réutiliser sans réimporter</p>
              <div className="mt-2 flex gap-2">
                <Select value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 flex-1 text-xs" aria-label="Section de la boutique">
                  <option value="">Section de la boutique…</option>
                  {sections.map((s: any) => <option key={`${s.template}|${s.id}`} value={`${s.template}|${s.id}`}>{s.template} · {s.name}</option>)}
                </Select>
                <Button size="sm" variant="secondary" icon={<Store className="size-3.5" />} onClick={useInShop} disabled={!target}>Placer</Button>
              </div>
              <Button size="sm" variant="ghost" className="mt-2" icon={<Send className="size-3.5" />} onClick={toPost}>Créer une publication avec ce média</Button>
            </div>
          )}
          {(a.kind === "image" || a.kind === "video") && (
            <div className="rounded-2xl border border-line p-3">
              <p className="text-xs font-medium">Canva</p>
              {a.meta?.canva?.editUrl ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={a.meta.canva.editUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] text-paper"><ExternalLink className="size-3.5" /> Ouvrir dans Canva</a>
                  <Button size="sm" variant="secondary" onClick={() => canva("import")}>Récupérer la version Canva</Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => canva("send")}>Envoyer vers Canva</Button>
              )}
              <p className="mt-1.5 text-[11px] text-muted">Via l'API officielle Canva Connect (compte à connecter dans Connexions). La version retouchée revient comme nouvelle version liée.</p>
            </div>
          )}
          {(data?.usages.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-muted">Utilisé dans</p>
              <ul className="mt-1 grid gap-1 text-xs">{data!.usages.map((u) => <li key={u.target_type + u.target_id}>• {u.target_type === "post" ? "Publication" : u.target_type === "theme_section" ? "Boutique" : u.target_type} · {u.label || u.target_id}</li>)}</ul>
            </div>
          )}
          {data && (data.versions.length > 1 || data.derived.length > 0 || data.source) && (
            <div>
              <p className="text-xs font-medium text-muted">Versions et dérivés</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...(data.source ? [data.source] : []), ...data.versions.filter((v) => v.id !== a.id), ...data.derived].slice(0, 10).map((v) => (
                  <Link key={v.id} href={v.url} target="_blank" className={cx("block size-14 overflow-hidden rounded-xl border border-line")} title={v.name}>
                    <AssetThumb a={v} className="size-full" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
