"use client";
/**
 * Onglet Publicités, organisé comme Publications : sous-menu à gauche (Piloter / Créer / Gérer).
 * Les visuels PUBLICITAIRES (créations « ad », publicités vidéo, UGC) vivent ici et seulement ici : ils ne sont jamais
 * repris pour une publication organique, et la banque d'images reste neutre. Aucune dépense publicitaire n'est
 * engagée depuis le studio : budget et lancement se règlent dans le gestionnaire de chaque réseau.
 */
import { useEffect, useState } from "react";
import { BarChart3, Clapperboard, Download, FolderOpen, Gauge, ImageIcon, Megaphone, Target } from "lucide-react";
import { Badge, Button, Card, cx, Empty, Select, useApi } from "../ui";
import { useProject } from "./project-context";
import { StatusBadge, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useT } from "../i18n";
import { AdCreatives } from "./ad-editor/ad-creatives";
import { AiAdCreator } from "./ad-editor/ai-ad-creator";
import { VideoV2Panel } from "./video-v2-panel";
import { GuidedVideo } from "./guided-video";
import { CampaignsPanel, StrategyPanel, type Campaign } from "./ad-campaigns";
import { isAdVisual } from "@/lib/media/bank";
import { InitialCreatives } from "./initial-creatives";
import {planAllowsAds} from '@/lib/plan-entitlements';
import type {PlanId} from '@/lib/plans';

const SECTIONS = [
  ["vue", "Vue d'ensemble", "Overview", Gauge, "piloter"],
  ["strategie", "Stratégie publicitaire", "Ad strategy", Target, "piloter"],
  ["image", "Publicité image", "Image ad", ImageIcon, "creer"],
  ["video", "Publicité vidéo", "Video ad", Clapperboard, "creer"],
  ["campagnes", "Campagnes", "Campaigns", Megaphone, "gerer"],
  ["bibliotheque", "Visuels publicitaires", "Ad visuals", FolderOpen, "gerer"],
] as const;
type Section = (typeof SECTIONS)[number][0];
const GROUPS = [
  ["piloter", "Piloter", "Steer"],
  ["creer", "Créer", "Create"],
  ["gerer", "Gérer", "Manage"],
] as const;

export default function TabPublicites() {
  const { id,data } = useProject();
  const creationAllowed=planAllowsAds((data?.plan??null) as PlanId|null);
  const t = useT();
  const [section, setSection] = useState<Section>("vue");
  const [newCampaign, setNewCampaign] = useState(false);
  // Lien direct vers une rubrique (#image, #campagnes…), y compris quand seul le lien change.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as Section;
      if (SECTIONS.some((x) => x[0] === h)) setSection(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const go = (x: Section, o: { newCampaign?: boolean } = {}) => {
    setNewCampaign(!!o.newCampaign);
    setSection(x);
    try {
      history.replaceState(null, "", `#${x}`);
    } catch {}
  };
  const { data: files, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=ad,video`);
  useEffect(()=>{const updated=(event:Event)=>{if((event as CustomEvent<{projectId?:string}>).detail?.projectId===id)void reload();};window.addEventListener('studio:videos-changed',updated);return()=>window.removeEventListener('studio:videos-changed',updated);},[id,reload]);
  const { data: camps,reload:reloadCampaigns } = useApi<{ campaigns: Campaign[] }>(`/api/projects/${id}/campaigns`);
  useEffect(()=>{const changed=(event:Event)=>{if((event as CustomEvent<{projectId?:string}>).detail?.projectId===id){void reload();void reloadCampaigns();}};window.addEventListener('studio:campaigns-changed',changed);return()=>window.removeEventListener('studio:campaigns-changed',changed);},[id,reload,reloadCampaigns]);
  const adVisuals = (files?.assets ?? []).filter((a) => isAdVisual(a) && !a.name.includes("refusee"));
  const counts = { images: adVisuals.filter((a) => a.kind === "image").length, videos: adVisuals.filter((a) => a.kind === "video").length, campaigns: camps?.campaigns.length ?? 0 };
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]" data-ads-studio>
      <aside className="min-w-0 lg:sticky lg:top-24 lg:h-max" data-ads-subnav>
        <Card className="p-3">
          <Select aria-label={t("Rubrique", "Section")} value={section} onChange={(e) => go(e.target.value as Section)} className="lg:hidden">
            {GROUPS.map(([g, gfr, gen]) => (
              <optgroup key={g} label={t(gfr, gen)}>
                {SECTIONS.filter((x) => x[4] === g).map(([key, frl, enl]) => <option key={key} value={key}>{t(frl, enl)}</option>)}
              </optgroup>
            ))}
          </Select>
          <nav className="hidden lg:block" aria-label={t("Rubriques des publicités", "Ad sections")}>
            {GROUPS.map(([g, gfr, gen]) => (
              <div key={g} className="mb-2 last:mb-0">
                <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted">{t(gfr, gen)}</p>
                {SECTIONS.filter((x) => x[4] === g).map(([key, frl, enl, Icon]) => (
                  <button key={key} type="button" data-ads-section={key} aria-current={section === key ? "page" : undefined} onClick={() => go(key)} className={cx("mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition", section === key ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}>
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1">{t(frl, enl)}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </Card>
      </aside>
      <div className="grid min-w-0 grid-cols-1 content-start gap-5">
        <InitialCreatives ads onChange={reload}/>
        {!creationAllowed&&<Card className="p-4 text-sm" data-ad-plan-lock>{t('La création de publicités et l’aide aux campagnes nécessitent Dominer. Vos créations déjà acquises restent consultables.','Creating ads and campaign assistance require Dominate. Existing creations remain readable.')} <a href="/studio/compte" className="underline">{t('Voir mon forfait','View my plan')}</a></Card>}
        {section === "vue" && <AdsOverview counts={counts} onGo={go} />}
        {section === "strategie" && <AdsStrategy campaigns={camps?.campaigns ?? null} onGo={go} />}
        {section === "image" && (
          <>
            {creationAllowed&&<AiAdCreator />}
            <AdCreatives />
          </>
        )}
        {section === "video" && (
          <>
            <Card className="p-4 text-sm text-ink-2">{t("Publicités vidéo et vidéos UGC (personnage synthétique, toujours signalé). Elles restent dans Publicités : les vidéos des publications organiques se créent dans Publications › Publication vidéo.", "Video ads and UGC videos (synthetic presenter, always disclosed). They stay in Ads: organic post videos are created in Posts › Video post.")}</Card>
            {creationAllowed&&<GuidedVideo as="ad" />}
            {creationAllowed&&<details className="mt-5 rounded-xl border border-line p-4"><summary className="cursor-pointer font-medium">{t("Montage avancé de vos médias", "Advanced media editing")}</summary><VideoV2Panel scope="ad" /></details>}
          </>
        )}
        {section === "campagnes" && <CampaignsPanel autoNew={newCampaign} />}
        {section === "bibliotheque" && <AdsLibrary assets={files ? adVisuals : null} reload={reload} />}
      </div>
    </div>
  );
}

/** Vue d'ensemble : ce qui existe, la règle « publicitaire ≠ organique » et les prochaines étapes. */
function AdsOverview({ counts, onGo }: { counts: { images: number; videos: number; campaigns: number }; onGo: (s: Section, o?: { newCampaign?: boolean }) => void }) {
  const t = useT();
  const tiles: [string, number, Section][] = [
    [t("Publicités image", "Image ads"), counts.images, "image"],
    [t("Publicités vidéo", "Video ads"), counts.videos, "video"],
    [t("Campagnes", "Campaigns"), counts.campaigns, "campagnes"],
  ];
  return (
    <div className="grid gap-5" data-ads-overview>
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map(([label, n, s]) => (
          <button key={label} type="button" onClick={() => onGo(s)} className="rounded-2xl border border-line bg-card p-4 text-left transition hover:border-ink">
            <p className="text-xs text-muted">{label}</p>
            <p className="font-display text-3xl font-semibold">{n}</p>
          </button>
        ))}
      </div>
      <Card className="grid gap-3 p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold">{t("Publicité ou publication : deux usages séparés", "Ad or post: two separate uses")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-paper-2 p-4 text-sm">
            <p className="font-medium">{t("Ici, les publicités", "Here, the ads")}</p>
            <p className="mt-1 text-muted">{t("Visuels et vidéos faits pour être diffusés contre paiement : une offre, un bouton d'action, des formats de gestionnaire de publicités. Ils ne sont jamais publiés comme publications organiques.", "Visuals and videos made to run as paid ads: an offer, a call-to-action button, ads-manager formats. They're never published as organic posts.")}</p>
          </div>
          <div className="rounded-2xl border border-line p-4 text-sm">
            <p className="font-medium">{t("Dans Publications, l'organique", "In Posts, the organic content")}</p>
            <p className="mt-1 text-muted">{t("Les publications gratuites de vos réseaux : conseils, coulisses, nouveautés. La banque d'images et de vidéos reste neutre et sert aux deux.", "Your networks' free posts: tips, behind the scenes, news. The image and video bank stays neutral and serves both.")}</p>
          </div>
        </div>
        <p className="text-xs text-muted">{t("Aucune dépense publicitaire n'est engagée depuis le studio : le budget et le lancement se règlent dans le gestionnaire de publicités de chaque réseau, avec l'export des campagnes.", "No ad spend is committed from the studio: budget and launch are set in each network's ads manager, using the campaign export.")}</p>
      </Card>
      <Card className="grid gap-3 p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold">{t("Par où commencer", "Where to start")}</h3>
        <ol className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-2xl bg-paper-2 p-3"><button type="button" className="font-semibold underline" onClick={() => onGo("image")}>{t("1. Créer les publicités", "1. Create the ads")}</button> — {t("image ou vidéo, aux formats des réseaux.", "image or video, in the networks' formats.")}</li>
          <li className="rounded-2xl bg-paper-2 p-3"><button type="button" className="font-semibold underline" onClick={() => onGo("campagnes", { newCampaign: true })}>{t("2. Préparer une campagne", "2. Prepare a campaign")}</button> — {t("annonces, audiences, plan de test.", "ads, audiences, test plan.")}</li>
          <li className="rounded-2xl bg-paper-2 p-3"><button type="button" className="font-semibold underline" onClick={() => onGo("campagnes")}>{t("3. Exporter et lancer", "3. Export and launch")}</button> — {t("dans le gestionnaire de publicités du réseau.", "in the network's ads manager.")}</li>
        </ol>
      </Card>
    </div>
  );
}

/** Stratégie publicitaire : plans de test des campagnes (audiences, accroches, budget de test, indicateurs). */
function AdsStrategy({ campaigns, onGo }: { campaigns: Campaign[] | null; onGo: (s: Section, o?: { newCampaign?: boolean }) => void }) {
  const t = useT();
  const withPlan = (campaigns ?? []).filter((c) => c.plan.strategy);
  return (
    <div className="grid gap-5" data-ads-strategy>
      <Card className="grid gap-3 p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold">{t("Stratégie publicitaire", "Ad strategy")}</h3>
        <p className="text-sm text-muted">{t("Chaque campagne a son plan de test : audiences, accroches des 3 premières secondes, structure, budget de test honnête et indicateurs. Rien n'est promis : les résultats se mesurent dans le gestionnaire de publicités.", "Each campaign has its test plan: audiences, first-3-second hooks, structure, honest test budget and metrics. Nothing is promised: results are measured in the ads manager.")}</p>
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-2xl bg-paper-2 p-3"><span className="font-medium">{t("Tester peu à la fois", "Test one thing at a time")}</span><span className="block text-xs text-muted">{t("une seule variable par test (accroche, visuel ou audience).", "a single variable per test (hook, visual or audience).")}</span></li>
          <li className="rounded-2xl bg-paper-2 p-3"><span className="font-medium">{t("Budget de test d'abord", "Test budget first")}</span><span className="block text-xs text-muted">{t("un petit budget fixé par vous, puis on garde ce qui marche.", "a small budget you set, then keep what works.")}</span></li>
          <li className="rounded-2xl bg-paper-2 p-3"><span className="font-medium">{t("Mesurer le vrai résultat", "Measure the real result")}</span><span className="block text-xs text-muted">{t("ventes ou demandes reçues, pas seulement les clics.", "sales or enquiries received, not just clicks.")}</span></li>
        </ul>
      </Card>
      {campaigns === null ? null : withPlan.length ? (
        withPlan.map((c) => (
          <div key={c.id} className="grid gap-2">
            <p className="font-display text-lg font-semibold">{c.name}</p>
            <StrategyPanel s={c.plan.strategy!} />
          </div>
        ))
      ) : (
        <Empty title={t("Aucun plan de test pour l'instant", "No test plan yet")} icon={<BarChart3 className="size-5" />} action={<Button onClick={() => onGo("campagnes", { newCampaign: true })}>{t("Préparer une campagne", "Prepare a campaign")}</Button>}>
          {t("Créez une campagne puis « Proposer les annonces » : le plan de test apparaît ici.", "Create a campaign then \"Draft ads\": the test plan appears here.")}
        </Empty>
      )}
    </div>
  );
}

/** Tous les visuels publicitaires (images et vidéos), séparés de l'organique, prêts à télécharger. */
function AdsLibrary({ assets, reload }: { assets: AssetView[] | null; reload: () => void }) {
  const t = useT();
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [kind, setKind] = useState<"" | "image" | "video">("");
  const shown = (assets ?? []).filter((a) => !kind || a.kind === kind);
  return (
    <div className="grid gap-4" data-ads-library>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">{t("Visuels publicitaires", "Ad visuals")}</h3>
          <p className="text-sm text-muted">{t("Uniquement les créations publicitaires : elles ne se mélangent pas aux publications organiques.", "Ad creatives only: they don't mix with organic posts.")}</p>
        </div>
        <div className="flex gap-1.5" role="tablist">
          {([["", "Tous", "All"], ["image", "Images", "Images"], ["video", "Vidéos", "Videos"]] as const).map(([v, fr, en]) => (
            <button key={v} role="tab" aria-selected={kind === v} onClick={() => setKind(v)} className={cx("rounded-full border px-3 py-1 text-sm", kind === v ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{t(fr, en)}</button>
          ))}
        </div>
      </div>
      {assets && shown.length === 0 ? (
        <Empty title={t("Aucun visuel publicitaire", "No ad visuals")} icon={<Megaphone className="size-5" />}>{t("Créez une publicité image ou vidéo : elle arrive ici.", "Create an image or video ad: it lands here.")}</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((a) => (
            <Card key={a.id} className="flex min-w-0 flex-col overflow-hidden">
              <button type="button" onClick={() => setViewer(a)} className="relative block bg-paper-2">
                {a.kind === "video" ? <video src={a.url} poster={a.thumbUrl ?? undefined} preload="none" className="aspect-[4/5] w-full object-cover" /> : <img src={a.thumbUrl ?? a.url} alt={a.name} loading="lazy" className="aspect-[4/5] w-full object-cover" />}
                <span className="absolute left-2 top-2"><StatusBadge status={a.status} /></span>
              </button>
              <div className="flex items-center gap-1.5 p-3">
                {a.meta?.format && <Badge>{a.meta.format}</Badge>}
                <span className="flex-1" />
                <a href={a.downloadUrl} className="grid size-8 place-items-center rounded-full border border-line hover:border-ink" title={t("Télécharger", "Download")} aria-label={t("Télécharger", "Download")}><Download className="size-3.5" /></a>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}
