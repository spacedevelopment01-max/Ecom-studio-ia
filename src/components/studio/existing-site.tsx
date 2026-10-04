"use client";
/** « J'ai déjà mon site et mon logo » : affichage du site du client dans le studio (conservé ou reproduit). */
import { useState } from "react";
import { AlertTriangle, ExternalLink, Globe, Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { api, Badge, Button, Card, cx, Modal, useToast } from "../ui";
import { useT } from "../i18n";
import { useProject } from "./project-context";
import { useCostConfirm } from "./cost-confirm";
import { ThemeImportModal } from "./theme-import";
import type { ExistingSiteSummary } from "@/lib/project-types";

const host = (u?: string) => {
  try {
    return u ? new URL(u).host.replace(/^www\./, "") : "";
  } catch {
    return u ?? "";
  }
};

/** Mention « repris de votre site » (provenance honnête des informations). */
export function FromSiteBadge({ site, className }: { site?: ExistingSiteSummary | null; className?: string }) {
  const t = useT();
  if (!site || site.status !== "read") return null;
  return (
    <a href={site.finalUrl ?? site.url} target="_blank" rel="noreferrer" className={cx("inline-flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info hover:underline", className)} title={t("Ouvrir votre site", "Open your website")}>
      <Globe className="size-3" aria-hidden /> {t("Repris de votre site", "Taken from your website")} · {host(site.finalUrl ?? site.url)}
    </a>
  );
}

/** Lecture en cours ou impossible. */
export function SiteReading({ site }: { site: ExistingSiteSummary }) {
  const t = useT();
  if (site.status === "failed")
    return (
      <Card className="flex items-start gap-3 border-bad/40 p-5">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">{t("Votre site n'a pas pu être lu", "Your website could not be read")}</p>
          <p className="mt-1 break-words text-sm text-muted">{site.error}</p>
          <p className="mt-2 text-sm text-muted">{t("Vérifiez l'adresse puis relancez l'étape depuis le Pilote.", "Check the address, then restart the step from the Pilot.")}</p>
        </div>
      </Card>
    );
  return (
    <Card className="flex items-center gap-3 p-5">
      <Loader2 className="size-5 shrink-0 animate-spin text-signal" aria-hidden />
      <p className="min-w-0 text-sm">{t("Lecture de votre site en cours :", "Reading your website:")} <span className="break-all font-medium">{host(site.url)}</span></p>
    </Card>
  );
}

/** Site conservé tel quel : carte « Votre site actuel ». */
export function KeptSiteCard({ site, onChanged }: { site: ExistingSiteSummary; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const { id, data, reload } = useProject();
  const cost = useCostConfirm();
  const [importOpen, setImportOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const services = data?.business === "services";
  const url = site.finalUrl ?? site.url;
  async function createNew() {
    if (!(await cost.confirm("theme"))) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: "PATCH", body: { existingSite: { newSiteRequested: true } } });
      await api(`/api/projects/${id}/theme/build`, { body: {} });
      toast("ok", services ? t("Le studio compose un nouveau site : il apparaîtra ici dans un instant. Votre site actuel n'est pas touché.", "The studio is building a new website: it will appear here shortly. Your current website is not touched.") : t("Le studio compose une nouvelle boutique : elle apparaîtra ici dans un instant. Votre site actuel n'est pas touché.", "The studio is building a new store: it will appear here shortly. Your current website is not touched."));
      setConfirmNew(false);
      reload();
      onChanged();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const stat = (n: number | undefined, fr: string, en: string) => (
    <div className="rounded-2xl bg-paper-2 px-3 py-2.5">
      <p className="font-display text-2xl font-semibold leading-none">{n ?? 0}</p>
      <p className="mt-1 text-xs text-muted">{t(fr, en)}</p>
    </div>
  );
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      {cost.dialog}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 border-b border-line p-5 sm:p-6">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white p-2">
            {site.logoAssetId ? <img src={`/api/files/${site.logoAssetId}`} alt={t("Votre logo", "Your logo")} className="max-h-full max-w-full object-contain" /> : <Globe className="size-6 text-muted" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[.16em] text-signal">{t("Votre site actuel", "Your current website")}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold leading-tight">{site.name || host(url)}</h2>
            <a href={url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 break-all text-sm text-ink-2 underline underline-offset-2">{url}</a>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="ok" dot>{t(`Conservé tel quel sur ${site.platformLabel}`, `Kept as is on ${site.platformLabel}`)}</Badge>
              <Badge tone="neutral">{site.business === "services" ? t("Site de services", "Services website") : t("Boutique", "Store")}</Badge>
              {site.logoProvided && <Badge tone="info">{t("Logo envoyé par vous", "Logo sent by you")}</Badge>}
            </div>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:p-6">
          <p className="text-sm text-ink-2">{t("Le studio ne modifie pas votre site. Il s'en sert pour tout le reste : images, vidéos, publications, publicités et calendrier, avec votre logo, vos couleurs et vos textes.", "The studio does not change your website. It uses it for everything else: images, videos, posts, ads and calendar, with your logo, your colors and your text.")}</p>
          <div className="grid grid-cols-3 gap-2">
            {stat(site.pages, "page(s) lue(s)", "page(s) read")}
            {stat(site.products, "produit(s)", "product(s)")}
            {stat(site.images, "image(s) reprise(s)", "image(s) retrieved")}
          </div>
          {!!site.evidence?.length && (
            <div>
              <p className="text-sm font-medium">{t(`Pourquoi ${site.platformLabel} ?`, `Why ${site.platformLabel}?`)}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {site.evidence.map((e) => <li key={e} className="max-w-full break-all rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2">{e}</li>)}
              </ul>
            </div>
          )}
          {(!!site.colors?.length || !!site.fonts?.length) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {!!site.colors?.length && (
                <div>
                  <p className="text-sm font-medium">{t("Couleurs", "Colors")}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {site.colors.map((c) => <span key={c} title={c} className="size-7 rounded-full border border-line" style={{ background: c }}><span className="sr-only">{c}</span></span>)}
                  </div>
                </div>
              )}
              {!!site.fonts?.length && (
                <div>
                  <p className="text-sm font-medium">{t("Polices", "Fonts")}</p>
                  <p className="mt-1.5 text-sm text-ink-2">{site.fonts.join(", ")}</p>
                </div>
              )}
            </div>
          )}
          {!!site.warnings?.length && (
            <div className="rounded-2xl bg-warn-soft p-3.5 text-sm text-warn">
              <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="size-4" aria-hidden /> {t("À savoir", "Good to know")}</p>
              <ul className="mt-1.5 grid gap-1 text-[13px]">
                {site.warnings.map((w) => <li key={w} className="break-words">{w}</li>)}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper"><ExternalLink className="size-4" aria-hidden /> {t("Ouvrir mon site", "Open my website")}</a>
            {site.platform === "shopify" && <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>{t("Importer mon thème", "Import my theme")}</Button>}
            <Button variant="ghost" icon={<Sparkles className="size-4" />} onClick={() => setConfirmNew(true)}>{t("Faire créer un nouveau site par le studio", "Have the studio create a new website")}</Button>
          </div>
          {site.platform === "shopify" && <p className="-mt-2 text-xs text-muted">{t("« Importer mon thème » : téléchargez votre thème depuis Shopify (Thèmes › … › Télécharger), puis importez-le ici pour le modifier dans le studio.", "“Import my theme”: download your theme from Shopify (Themes › … › Download), then import it here to edit it in the studio.")}</p>}
        </div>
      </Card>
      <ThemeImportModal open={importOpen} onClose={() => setImportOpen(false)} projectId={id} onImported={() => { reload(); onChanged(); }} />
      <Modal open={confirmNew} onClose={() => setConfirmNew(false)} title={t("Créer un nouveau site ?", "Create a new website?")}>
        <p className="text-sm text-ink-2">{t("Le studio compose un nouveau site avec votre logo, vos couleurs et vos contenus. Votre site actuel n'est ni modifié ni remplacé : vous déciderez vous-même de publier ou non le nouveau.", "The studio builds a new website with your logo, your colors and your content. Your current website is neither changed nor replaced: you decide yourself whether to publish the new one.")}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmNew(false)}>{t("Annuler", "Cancel")}</Button>
          <Button variant="signal" loading={busy} disabled={!data?.brand} icon={<RefreshCw className="size-4" />} onClick={createNew}>{t("Oui, créer un nouveau site", "Yes, create a new website")}</Button>
        </div>
        {!data?.brand && <p className="mt-2 text-xs text-muted">{t("Disponible quand votre marque est prête (voir le Pilote).", "Available once your brand is ready (see the Pilot).")}</p>}
      </Modal>
    </div>
  );
}

/** Site reproduit : bandeau « Reproduction de votre site (Webflow → Shopify) » avec les notes honnêtes. */
export function ReproductionBanner({ site }: { site: ExistingSiteSummary }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const url = site.finalUrl ?? site.url;
  return (
    <div className="rounded-2xl border border-info/30 bg-info-soft p-3.5 text-sm">
      <p className="font-medium text-ink">{t(`Reproduction de votre site (${site.platformLabel} → ${site.target})`, `Reproduction of your website (${site.platformLabel} → ${site.target})`)}</p>
      <p className="mt-1 text-[13px] text-ink-2">{t("Mêmes pages, menu, textes, images, logo, couleurs et polices. Le code de votre ancien thème n'est pas copié : la mise en page utilise les sections du studio, modifiables ici.", "Same pages, menu, text, images, logo, colors and fonts. Your old theme's code is not copied: the layout uses the studio's sections, which you can edit here.")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {!!site.notes?.length && <button onClick={() => setOpen(!open)} aria-expanded={open} className="text-[13px] font-medium text-info underline underline-offset-2">{open ? t("Masquer le détail", "Hide details") : t(`Ce qui est fidèle, ce qui est approché (${site.notes.length})`, `What is exact, what is approximated (${site.notes.length})`)}</button>}
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-info underline underline-offset-2"><ExternalLink className="size-3.5" aria-hidden /> {t("Voir mon site d'origine", "View my original website")}</a>
      </div>
      {open && (
        <ul className="mt-2 grid list-disc gap-1 pl-5 text-[13px] text-ink-2">
          {site.notes!.map((n) => <li key={n}>{n}</li>)}
          {site.warnings?.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Pilote : provenance du projet (« Votre site actuel »), conservé ou reproduit. */
export function SitePilotCard({ site, projectId }: { site: ExistingSiteSummary; projectId: string }) {
  const t = useT();
  const url = site.finalUrl ?? site.url;
  if (site.status !== "read") return <SiteReading site={site} />;
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 text-sm text-muted"><Globe className="size-4" aria-hidden /> {t("Votre site actuel", "Your current website")}</p>
      <p className="mt-1 font-display text-xl">{site.name || host(url)}</p>
      <a href={url} target="_blank" rel="noreferrer" className="mt-0.5 block break-all text-sm text-ink-2 underline underline-offset-2">{host(url)}</a>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {site.decision === "keep" ? <Badge tone="ok" dot>{t(`Conservé tel quel sur ${site.platformLabel}`, `Kept as is on ${site.platformLabel}`)}</Badge> : <Badge tone="info" dot>{t(`Reproduit : ${site.platformLabel} → ${site.target}`, `Reproduced: ${site.platformLabel} → ${site.target}`)}</Badge>}
      </div>
      <p className="mt-2 text-sm text-ink-2">
        {t(`Repris de votre site : ${site.pages ?? 0} page(s), ${site.products ?? 0} produit(s), ${site.images ?? 0} image(s)${site.logoAssetId ? ", votre logo" : ""}, vos couleurs et vos polices.`, `Taken from your website: ${site.pages ?? 0} page(s), ${site.products ?? 0} product(s), ${site.images ?? 0} image(s)${site.logoAssetId ? ", your logo" : ""}, your colors and your fonts.`)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`/studio/${projectId}/boutique`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">{site.decision === "keep" ? t("Voir mon site dans le studio", "See my website in the studio") : t("Ouvrir la reproduction", "Open the reproduction")}</a>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink"><ExternalLink className="size-4" aria-hidden /> {t("Ouvrir mon site", "Open my website")}</a>
      </div>
    </Card>
  );
}
