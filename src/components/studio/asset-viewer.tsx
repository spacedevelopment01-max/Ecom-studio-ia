"use client";
/** Visionneuse d'un média : aperçu, informations, versions, usages, actions. */
import Link from "next/link";
import { useState } from "react";
import { Check, Download, ExternalLink, Send, Store, X, Package } from "lucide-react";
import { api, Badge, Button, cx, formatBytes, formatDate, Modal, Select, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, ROLE_LABEL, StatusBadge, type AssetView } from "./common";
import { useT } from "../i18n";

type Info = { asset: AssetView; usages: { target_type: string; target_id: string; label: string }[]; versions: AssetView[]; derived: AssetView[]; source: AssetView | null };

export function AssetViewer({ asset, onClose, onChanged }: { asset: AssetView | null; onClose: () => void; onChanged?: () => void }) {
  const { id: projectId, reload } = useProject();
  const toast = useToast();
  const t = useT();
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
      await api(`/api/projects/${projectId}/theme/ops`, { body: { ops: [{ op: "use_media", template, section, key: a.kind === "video" ? "video" : "image", assetId: a.id }], summary: t(`Média « ${a.name} » placé dans la boutique`, `Media "${a.name}" placed in the store`) } });
      toast("ok", t("Média placé dans la boutique (nouvelle version créée).", "Media placed in the store (new version created)."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const toPost = async () => {
    try {
      await api(`/api/projects/${projectId}/posts`, { body: { network: a.kind === "video" ? "instagram" : "instagram", format: a.kind === "video" ? "reel" : "image", caption: "", media: [a.id] } });
      toast("ok", t("Brouillon de publication créé avec ce média (espace Publications).", "Post draft created with this media (Posts area)."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const canva = async (action: "send" | "import") => {
    try {
      await api(`/api/files/${a.id}/canva`, { body: { action, format: a.kind === "video" ? "mp4" : "png" } });
      toast("ok", action === "send" ? t("Envoi vers Canva en cours : le lien d'édition apparaîtra ici.", "Sending to Canva: the edit link will appear here.") : t("Récupération de l'export Canva en cours.", "Fetching the Canva export."));
      setTimeout(reloadInfo, 4000);
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const sections = (theme?.current?.structure ?? []).filter((tp: any) => ["index", "product", "page.about"].includes(tp.template)).flatMap((tp: any) => tp.sections.map((s: any) => ({ ...s, template: tp.template })));
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
            {a.version > 1 && <Badge tone="info">{t("version", "version")} {a.version}</Badge>}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted">{t("Dimensions", "Dimensions")}</dt><dd>{a.width && a.height ? `${a.width} × ${a.height}` : t("Inconnues", "Unknown")}</dd></div>
            <div><dt className="text-muted">{t("Poids", "Size")}</dt><dd>{formatBytes(a.size)}</dd></div>
            {a.duration && <div><dt className="text-muted">{t("Durée", "Duration")}</dt><dd>{a.duration.toFixed(1)} s</dd></div>}
            <div><dt className="text-muted">{t("Origine", "Source")}</dt><dd>{a.origin === "upload" ? t("Importé", "Uploaded") : a.origin === "generated" ? t("Créé par le studio", "Created by the studio") : a.origin === "site" ? t("Repris de votre site", "Taken from your website") : a.origin}</dd></div>
            <div className="col-span-2"><dt className="text-muted">{t("Créé le", "Created on")}</dt><dd>{formatDate(a.createdAt)}</dd></div>
            {a.meta?.recipe && <div className="col-span-2"><dt className="text-muted">{t("Recette", "Recipe")}</dt><dd>{a.meta.recipe}{a.meta.provider ? ` · ${a.meta.provider}` : ""}</dd></div>}
            {a.meta?.delivered && <div className="col-span-2"><dt className="text-muted">{t("Fichier livré", "Delivered file")}</dt><dd>{a.meta.delivered}</dd></div>}
            {a.meta?.fidelity && <div className="col-span-2"><dt className="text-muted">{t("Fidélité", "Fidelity")}</dt><dd>{a.meta.fidelity}</dd></div>}
            {a.meta?.qc?.score !== undefined && <div className="col-span-2"><dt className="text-muted">{t("Contrôle visuel", "Visual check")}</dt><dd>{a.meta.qc.sameProduct ? t("Produit identique", "Product matches") : t("Écart détecté", "Discrepancy detected")} · {a.meta.qc.score}/10</dd></div>}
            {a.meta?.qc?.fallback && <div className="col-span-2"><dt className="text-muted">{t("Contrôle", "Check")}</dt><dd>{t(`Décor IA écarté (${a.meta.qc.fallback}) ; version studio utilisée.`, `AI backdrop discarded (${a.meta.qc.fallback}); studio version used.`)}</dd></div>}
            {a.meta?.issues?.length > 0 && <div className="col-span-2"><dt className="text-muted">{t("Points à vérifier", "Points to check")}</dt><dd>{a.meta.issues.join(t(" ; ", "; "))}</dd></div>}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={a.status === "approved" ? "primary" : "secondary"} icon={<Check className="size-4" />} onClick={() => status(a.status === "approved" ? "ready" : "approved")}>{a.status === "approved" ? t("Validé", "Approved") : t("Valider", "Approve")}</Button>
            <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={() => status("rejected")}>{t("Écarter", "Reject")}</Button>
            <a href={a.downloadUrl} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink"><Download className="size-3.5" /> {t("Télécharger", "Download")}</a>
            {a.kind === "video" && <a href={`/api/files/${a.id}/capcut`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] hover:border-ink"><Package className="size-3.5" /> {t("Pack CapCut", "CapCut pack")}</a>}
          </div>
          {(a.kind === "image" || a.kind === "video") && (
            <div className="rounded-2xl border border-line p-3">
              <p className="text-xs font-medium">{t("Réutiliser sans réimporter", "Reuse without re-uploading")}</p>
              <div className="mt-2 flex gap-2">
                <Select value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 flex-1 text-xs" aria-label={t("Section de la boutique", "Store section")}>
                  <option value="">{t("Section de la boutique…", "Store section…")}</option>
                  {sections.map((s: any) => <option key={`${s.template}|${s.id}`} value={`${s.template}|${s.id}`}>{s.template} · {s.name}</option>)}
                </Select>
                <Button size="sm" variant="secondary" icon={<Store className="size-3.5" />} onClick={useInShop} disabled={!target}>{t("Placer", "Place")}</Button>
              </div>
              <Button size="sm" variant="ghost" className="mt-2" icon={<Send className="size-3.5" />} onClick={toPost}>{t("Créer une publication avec ce média", "Create a post with this media")}</Button>
            </div>
          )}
          {(a.kind === "image" || a.kind === "video") && (
            <div className="rounded-2xl border border-line p-3">
              <p className="text-xs font-medium">Canva</p>
              {a.meta?.canva?.editUrl ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={a.meta.canva.editUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] text-paper"><ExternalLink className="size-3.5" /> {t("Ouvrir dans Canva", "Open in Canva")}</a>
                  <Button size="sm" variant="secondary" onClick={() => canva("import")}>{t("Récupérer la version Canva", "Fetch the Canva version")}</Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => canva("send")}>{t("Envoyer vers Canva", "Send to Canva")}</Button>
              )}
              <p className="mt-1.5 text-[11px] text-muted">{t("Via l'API officielle Canva Connect (compte à connecter dans Connexions). La version retouchée revient comme nouvelle version liée.", "Via the official Canva Connect API (connect your account in Connections). The edited version comes back as a new linked version.")}</p>
            </div>
          )}
          {(data?.usages.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-muted">{t("Utilisé dans", "Used in")}</p>
              <ul className="mt-1 grid gap-1 text-xs">{data!.usages.map((u) => <li key={u.target_type + u.target_id}>• {u.target_type === "post" ? t("Publication", "Post") : u.target_type === "theme_section" ? t("Boutique", "Store") : u.target_type} · {u.label || u.target_id}</li>)}</ul>
            </div>
          )}
          {data && (data.versions.length > 1 || data.derived.length > 0 || data.source) && (
            <div>
              <p className="text-xs font-medium text-muted">{t("Versions et dérivés", "Versions and derivatives")}</p>
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
