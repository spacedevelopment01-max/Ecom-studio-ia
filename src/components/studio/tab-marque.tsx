"use client";
import { useEffect, useState } from "react";
import { DirectionThumb } from "./direction-thumb";
import { paletteSources } from "@/lib/route-palette";
import { Check, Download, Lock, Sparkles, Trash2, Unlock } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, JobProgress, SectionTitle, useActive, type AssetView } from "./common";
import type { Brand } from "@/lib/project-types";
import { DIRECTIONS } from "@/lib/theme/directions";
import { useLang, useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";
import { FromSiteBadge } from "./existing-site";

const PALETTE_LABEL: Record<string, { fr: string; en: string }> = {
  primary: { fr: "Principale", en: "Primary" },
  secondary: { fr: "Secondaire", en: "Secondary" },
  accent: { fr: "Accent", en: "Accent" },
  light: { fr: "Clair", en: "Light" },
  dark: { fr: "Sombre", en: "Dark" },
};
/** Accroches des directions en anglais (le français vient de DIRECTIONS). */
const DIRECTION_TAGLINE_EN: Record<string, string> = {
  atelier: "Editorial luxury",
  clinique: "Big-tech clarity",
  brut: "Dark and bold",
  terroir: "Modern warmth",
  nocturne: "Deep night and glow",
  pop: "Bright and bouncy",
  galerie: "Gallery stillness",
  elan: "Athletic energy",
  flux: "Premium sportswear",
  joaillerie: "Intimate luxury",
  gourmand: "Joyful and generous",
};

export default function TabMarque() {
  const { id, data, reload } = useProject();
  const site = data?.settings.existingSite;
  const toast = useToast();
  const t = useT();
  const { lang } = useLang();
  const cl = useContentLang();
  const [b, setB] = useState<Brand | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [regen, setRegen] = useState(false);
  const [guidance, setGuidance] = useState("");
  const active = useActive("brand.build");
  const { data: logos, reload: reloadLogos } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=logo,logo-svg,logo-light,logo-light-svg,logo-mark,logo-mark-svg,logo-horizontal,logo-horizontal-svg,favicon,brand-guide,brand-book`);
  const { data: ident, reload: reloadIdent } = useApi<{ proposals: Proposal[]; current: string | null; max?: number; provided: boolean; taglines: string[] }>(`/api/projects/${id}/brand/logo`);
  const [kitTick, setKitTick] = useState(0);
  const [choosing, setChoosing] = useState<string | null>(null);
  // Logo : nouvelles pistes ou piste choisie, en tâche de fond (plusieurs minutes avec l'IA) ; l'écran suit la tâche
  // et se met à jour à la fin (aucune requête longue que le relais d'un codespace pourrait couper).
  const logoJobs = useActive("brand.logo");
  const chooseLogo = async (b: { proposalId?: string; regenerate?: boolean }) => {
    setChoosing(b.proposalId ?? "regenerate");
    try {
      const r = await api<{ jobId: string }>(`/api/projects/${id}/brand/logo`, { body: b });
      toast("ok", b.regenerate ? t("Création de nouvelles pistes lancée : elles apparaissent ici dès qu'elles sont prêtes (quelques minutes avec l'IA).", "New routes are being created: they appear here as soon as they're ready (a few minutes with AI).") : t("Logo en cours d'application : déclinaisons, kit réseaux sociaux et boutique mis à jour dans un instant.", "Applying the logo: variations, social kit and store updated in a moment."));
      reload();
      let misses = 0;
      for (let i = 0; i < 600; i++) {
        await new Promise((res) => setTimeout(res, 2500));
        // Coupure passagère (relais d'un codespace : 502, 504…) : la tâche continue, on réessaie sans rien afficher.
        let job: { status: string; error: string | null };
        try {
          ({ job } = await api<{ job: { status: string; error: string | null } }>(`/api/jobs/${r.jobId}`));
          misses = 0;
        } catch (e) {
          if (++misses < 40) continue;
          throw e;
        }
        if (job.status === "done") {
          toast("ok", b.regenerate ? t("Nouvelles pistes prêtes.", "New routes are ready.") : t("Logo appliqué : déclinaisons créées et boutique mise à jour (nouvelle version).", "Logo applied: variations created and store updated (new version)."));
          break;
        }
        if (job.status === "failed" || job.status === "cancelled") {
          if (job.status === "failed") toast("bad", job.error || t("La création n'a pas abouti. Réessayez.", "It didn't work out. Please try again."));
          break;
        }
      }
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setChoosing(null);
      reloadIdent();
      reloadLogos();
      setKitTick((k) => k + 1);
      reload();
    }
  };
  useEffect(() => {
    if (data?.brand && !dirty) setB(data.brand);
  }, [data?.brand, dirty]);
  useEffect(() => {
    if (!active.length) reloadLogos();
  }, [active.length, reloadLogos]);
  if (!data) return null;
  if (!b) return <div className="mx-auto max-w-3xl"><JobProgress job={active[0]} className="mb-6" /><Empty title={t("La marque n'est pas encore créée", "The brand hasn't been created yet")} icon={<Sparkles className="size-5" />}>{t("Elle apparaît ici dès que l'analyse du produit est terminée.", "It will appear here as soon as the product analysis is complete.")}</Empty></div>;
  const set = (patch: Partial<Brand>) => (setB({ ...b, ...patch }), setDirty(true));
  const validated = new Set(b.validated);
  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const r = await api<{ recolored?: boolean }>(`/api/projects/${id}/brand`, { method: "PATCH", body: { name: b!.name, tagline: b!.tagline, positioning: b!.positioning, audience: b!.audience, story: b!.story, tone: b!.tone, palette: b!.palette, direction: b!.direction, ...extra } });
      toast(
        "ok",
        r?.recolored
          ? t("Nouvelles couleurs appliquées partout : logo de la piste, site, bannières, kit réseaux sociaux et charte.", "New colors applied everywhere: route logo, site, banners, social media kit and brand guide.")
          : t("Marque enregistrée. Les prochaines créations utiliseront ces choix.", "Brand saved. Everything created next will use these choices."),
      );
      reloadLogos();
      reloadIdent();
      if (r?.recolored) setKitTick((k) => k + 1);
      setDirty(false);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const toggleValid = (key: string) => save(validated.has(key) ? { unvalidate: [key] } : { validate: [key] });
  const V = (k: string) => (
    <button onClick={() => toggleValid(k)} className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", validated.has(k) ? "bg-ok-soft text-ok" : "bg-paper-2 text-muted hover:text-ink")} title={validated.has(k) ? t("Validé : conservé lors des nouvelles propositions", "Approved: kept in new proposals") : t("Valider pour le conserver", "Approve to keep it")}>
      {validated.has(k) ? <Lock className="size-3" /> : <Unlock className="size-3" />} {validated.has(k) ? t("Validé", "Approved") : t("Valider", "Approve")}
    </button>
  );
  const byRole = (r: string) => (logos?.assets ?? []).find((a) => a.role === r);
  const routes = (ident?.proposals ?? []).filter((x) => x.route);
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <EngineNotice what={t("la direction de marque et le logo", "the brand direction and logo")} />
      {active[0] && <JobProgress job={active[0]} />}
      {logoJobs[0] && <JobProgress job={logoJobs[0]} />}
      {!ident?.provided && routes.length > 0 && <LogoRoutes routes={routes} max={ident!.max ?? 3} current={ident!.current} choosing={choosing} locked={validated.has("logo")} onChoose={(k) => chooseLogo({ proposalId: k })} onRegenerate={() => chooseLogo({ regenerate: true })} onDelete={async (k) => { try { await api(`/api/projects/${id}/brand/logo?proposal=${encodeURIComponent(k)}`, { method: "DELETE" }); reloadIdent(); } catch (e) { toast("bad", (e as Error).message); } }} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-7">
          <SectionTitle title={t("Identité", "Identity")} action={<div className="flex gap-2">{site?.status !== "read" && <Button variant="secondary" size="sm" icon={<Sparkles className="size-4" />} onClick={() => setRegen(true)}>{t("Nouvelle proposition", "New proposal")}</Button>}<Button size="sm" onClick={() => save()} loading={busy} disabled={!dirty}>{t("Enregistrer", "Save")}</Button></div>}>
            {site?.status === "read" ? (
              <>
                <FromSiteBadge site={site} className="mb-1.5" />
                <span className="block">{t("Nom, logo, couleurs et polices repris de votre site : votre marque reste la vôtre. Le positionnement, la cible et le ton sont proposés pour vos publications et publicités ; ajustez-les librement.", "Name, logo, colors and fonts taken from your website: your brand stays yours. Positioning, audience and tone are suggested for your posts and ads; adjust them freely.")}</span>
              </>
            ) : (
              <>{b.generatedBy === "ai" ? t("Proposée par l'IA à partir du produit.", "Proposed by the AI based on the product.") : t("Base proposée automatiquement : à affiner.", "Automatically suggested starting point: refine as needed.")} {t("Les éléments validés sont conservés lors des nouvelles propositions.", "Approved elements are kept in new proposals.")}</>
            )}
          </SectionTitle>
          {(b.checks?.length ?? 0) > 0 && (
            <div className="mb-5 rounded-xl border border-line bg-paper-2 p-3 text-sm" role="note">
              <p className="font-medium">{t("À vérifier par vous", "For you to check")}</p>
              <ul className="mt-1 list-disc pl-5 text-muted">{b.checks!.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between"><label htmlFor="bname" className="text-sm font-medium">{t("Nom de marque", "Brand name")}</label>{V("name")}</div>
              {b.nameStatus === "proposed" && site?.status !== "read" && <p className="text-xs text-muted">{t("Nom proposé : vérifiez qu'il est libre (INPI, EUIPO, nom de domaine, réseaux sociaux) avant de l'adopter.", "Suggested name: check that it's available (trademark offices, domain name, social handles) before adopting it.")}</p>}
              <Input id="bname" value={b.name} onChange={(e) => set({ name: e.target.value })} className="font-display text-xl" />
              {b.alternatives.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted">{t("Autres pistes :", "Other ideas:")}</span>
                  {b.alternatives.map((n) => <button key={n} onClick={() => set({ name: n })} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">{n}</button>)}
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between"><label htmlFor="btag" className="text-sm font-medium">{t("Signature", "Tagline")}</label>{V("tagline")}</div>
              <Input id="btag" value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder={t("Une phrase courte, sans promesse invérifiable", "A short line, with no unverifiable promise")} />
              {site?.status !== "read" && (ident?.taglines.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted">{t("Autres signatures :", "Other taglines:")}</span>
                  {ident!.taglines.map((tl) => <button key={tl} onClick={() => set({ tagline: tl })} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">{tl}</button>)}
                </div>
              )}
            </div>
            <Field label={t("Positionnement", "Positioning")} htmlFor="bpos"><Textarea autoGrow id="bpos" rows={3} value={b.positioning} onChange={(e) => set({ positioning: e.target.value })} /></Field>
            <Field label={t("Cible", "Audience")} htmlFor="baud"><Textarea autoGrow id="baud" rows={2} value={b.audience} onChange={(e) => set({ audience: e.target.value })} /></Field>
            <div className="grid gap-4">
              <Field label={t("Voix", "Voice")} htmlFor="bvoice"><Textarea autoGrow rows={1} id="bvoice" value={b.tone.voice} onChange={(e) => set({ tone: { ...b.tone, voice: e.target.value } })} /></Field>
              <div className="grid items-start gap-4 sm:grid-cols-2">
              <Field label={t("À faire", "Do")} htmlFor="bdo" hint={t("Un conseil par ligne.", "One tip per line.")}><LinesArea id="bdo" value={b.tone.do} onChange={(v) => set({ tone: { ...b.tone, do: v } })} /></Field>
              <Field label={t("À éviter", "Don't")} htmlFor="bdont" hint={t("Un point par ligne.", "One point per line.")}><LinesArea id="bdont" value={b.tone.dont} onChange={(v) => set({ tone: { ...b.tone, dont: v } })} /></Field>
              </div>
            </div>
            <Field label={t("Histoire de la marque", "Brand story")} htmlFor="bstory" hint={t("N'écrivez que des faits réels (origine, fondateurs, fabrication).", "Only write real facts (origin, founders, manufacturing).")}><Textarea autoGrow id="bstory" rows={4} value={b.story} onChange={(e) => set({ story: e.target.value })} /></Field>
            {(() => {
              // Piste de logo retenue : la palette affichée est la sienne (celle du site, des visuels et des vignettes) ;
              // modifier une couleur change la couleur d'origine qui l'alimente.
              const logo = data.brand?.logo ?? b.logo;
              const src = paletteSources({ palette: b.palette, logo });
              const route = logo?.route;
              const shown = (k: keyof Brand["palette"]) => b.palette[src[k]];
              return (
                <div>
                  <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">{t("Palette", "Palette")}</p>{V("palette")}</div>
                  {route && <p className="mb-2 text-xs text-muted">{t(`Couleurs de la piste « ${route.name} ». Cliquez sur une couleur pour la changer, puis enregistrez : la même piste est recolorée et tout se met à jour (logo, site, bannières, réseaux sociaux, charte).`, `Colors of the "${route.name}" route. Click a color to change it, then save: the same route is recolored and everything updates (logo, site, banners, social media, brand guide).`)}</p>}
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(b.palette) as (keyof Brand["palette"])[]).map((k) => (
                      <label key={k} className="grid gap-1.5 text-center text-xs">
                        <span className="relative h-16 overflow-hidden rounded-2xl border border-line" style={{ background: shown(k) }}>
                          <input type="color" value={shown(k)} onChange={(e) => set({ palette: { ...b.palette, [src[k]]: e.target.value.toUpperCase() } })} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={t(`Couleur ${PALETTE_LABEL[k].fr}`, `${PALETTE_LABEL[k].en} color`)} />
                        </span>
                        <span className="text-muted">{t(PALETTE_LABEL[k].fr, PALETTE_LABEL[k].en)}</span>
                        <span className="font-mono text-[10px]">{shown(k)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
        <div className="grid content-start gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-display text-lg font-semibold">{t("Logo", "Logo")} {b.logo.status === "provided" && b.logo.assetId && <Badge tone="ok">{t("fourni", "provided")}</Badge>}</h3>{V("logo")}</div>
            <p className="mt-1 text-xs text-muted">{b.logo.concept}</p>
            {!ident?.provided && (ident?.proposals.length ?? 0) > 0 && !routes.length && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t("Trois propositions", "Three proposals")}</p>
                <div className="grid gap-2">
                  {ident!.proposals.map((pr) => {
                    const on = ident!.current === pr.id;
                    return (
                      <div key={pr.id} className={cx("rounded-2xl border p-2", on ? "border-signal ring-2 ring-signal/30" : "border-line")}>
                        <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-white p-3"><img src={pr.url} alt={t(`Proposition ${pr.label}`, `Proposal ${pr.label}`)} className="h-full w-full object-contain" /></div>
                        <div className="mt-2 flex items-start justify-between gap-2 px-1">
                          <p className="min-w-0 text-xs"><span className="font-semibold">{pr.label}</span> <span className="text-muted">· {pr.concept}</span></p>
                          <Button size="sm" variant={on ? "secondary" : "primary"} disabled={on || !!choosing || validated.has("logo")} loading={choosing === pr.id} onClick={() => chooseLogo({ proposalId: pr.id })}>{on ? t("Choisi", "Selected") : t("Choisir", "Select")}</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Sparkles className="size-4" />} loading={choosing === "regenerate"} disabled={validated.has("logo")} onClick={() => chooseLogo({ regenerate: true })}>{t("Recréer les propositions", "Recreate proposals")}</Button>
                {validated.has("logo") && <p className="mt-1 text-[11px] text-muted">{t("Logo validé : déverrouillez-le pour en changer.", "Logo approved: unlock it to change it.")}</p>}
              </div>
            )}
            <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wider text-muted">{routes.length ? t("Déclinaisons de la piste choisie", "Variations of the chosen route") : t("Déclinaisons", "Variations")}</p>
            <div className="grid grid-cols-2 gap-2">
              {byRole("logo") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("logo")!.url} alt={t("Logo principal", "Main logo")} className="max-h-20 object-contain" /></div>}
              {byRole("logo-light") && <div className="grid place-items-center rounded-2xl bg-[#141210] p-4"><img src={byRole("logo-light")!.url} alt={t("Logo clair", "Light logo")} className="max-h-20 object-contain" /></div>}
              {byRole("logo-mark") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("logo-mark")!.url} alt={t("Monogramme", "Monogram")} className="max-h-20 object-contain" /></div>}
              {byRole("favicon") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("favicon")!.url} alt="Favicon" className="size-12 object-contain" /></div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["logo-svg", "logo", "logo-horizontal-svg", "logo-light-svg", "logo-mark-svg", "favicon"].map((r) => byRole(r) && (
                <a key={r} href={byRole(r)!.downloadUrl} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink"><Download className="size-3.5" /> {byRole(r)!.name}</a>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold">{t("Direction de la boutique", "Store direction")}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DIRECTIONS.map((d) => (
                <button key={d.id} onClick={() => set({ direction: d.id })} className={cx("overflow-hidden rounded-2xl border text-left transition", b.direction === d.id ? "border-signal ring-2 ring-signal" : "border-line hover:border-ink")} aria-pressed={b.direction === d.id}>
                  <DirectionThumb className="aspect-[4/3]" projectId={id} direction={d.id} version={`${data?.brand?.logo.assetId ?? ""}-${data?.project.updatedAt ?? ""}`} sandbox={data?.previewSandbox} fallback={`/demo/directions/${d.id}${lang === "en" ? ".en" : ""}.jpg`} />
                  <span className="block px-2.5 py-1.5 text-xs font-medium">{d.name} <span className="text-muted">· {t(d.tagline, DIRECTION_TAGLINE_EN[d.id] ?? d.tagline)}</span></span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">{t("Enregistrez puis appliquez la direction depuis l'espace Boutique (une nouvelle version est créée, l'ancienne reste restaurable).", "Save, then apply the direction from the Store tab (a new version is created; the previous one can still be restored).")}</p>
          </Card>
          <BrandBook />
        </div>
      </div>
      {routes.length > 0 && <SocialKit tick={kitTick} />}
      {data.strategy && (
        <Card className="p-5 sm:p-7">
          <SectionTitle title={t("Stratégie", "Strategy")}>{t("Angles et messages réutilisés pour les publications et les campagnes.", "Angles and messages reused for posts and campaigns.")}</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Messages clés", "Key messages")}</p><ul className="mt-2 grid gap-1.5 text-sm">{data.strategy.keyMessages.map((m) => <li key={m} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{m}</li>)}</ul></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Angles", "Angles")}</p><ul className="mt-2 grid gap-2 text-sm">{data.strategy.angles.map((a) => <li key={a.title}><strong>{a.title}</strong>{t(" : ", ": ")}<span className="text-ink-2">{a.idea}</span></li>)}</ul></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Piliers", "Pillars")}</p><div className="mt-2 flex flex-wrap gap-1.5">{data.strategy.pillars.map((p) => <Badge key={p}>{p}</Badge>)}</div></div>
          </div>
          {data.strategy.platform && (
            <div className="mt-6 grid gap-6 border-t border-line pt-6 md:grid-cols-2">
              <div className="grid gap-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Plateforme de marque", "Brand platform")}</p>
                {[
                  [t("Pour qui", "Who it's for"), data.strategy.platform.persona],
                  [t("Problème résolu", "Problem solved"), data.strategy.platform.problem],
                  [t("Face à la concurrence", "Versus the competition"), data.strategy.platform.alternatives],
                  [t("Différence", "What sets it apart"), data.strategy.platform.difference],
                ].filter(([, v]) => v).map(([k, v]) => <p key={k}><strong>{k}</strong>{t(" : ", ": ")}<span className="text-ink-2">{v}</span></p>)}
                {data.strategy.platform.proofs.some((x) => x.status === "missing") && (
                  <p className="rounded-xl bg-paper-2 p-3 text-xs text-ink-2">
                    <strong>{t("Arguments à prouver avant de les utiliser", "Claims to prove before using them")}{t(" : ", ": ")}</strong>
                    {data.strategy.platform.proofs.filter((x) => x.status === "missing").map((x) => x.claim).join(t(" ; ", "; "))}
                  </p>
                )}
              </div>
              {data.strategy.platform.objections.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Objections et réponses", "Objections and answers")}</p>
                  <ul className="mt-2 grid gap-2 text-sm">{data.strategy.platform.objections.map((o) => <li key={o.objection}><strong>{o.objection}</strong><br /><span className="text-ink-2">{o.answer}</span></li>)}</ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      <Modal open={regen} onClose={() => setRegen(false)} title={t("Nouvelle proposition de marque", "New brand proposal")}>
        <p className="text-sm text-muted">{t(`Les éléments validés (${b.validated.length ? b.validated.join(", ") : "aucun"}) seront conservés.`, `Approved elements (${b.validated.length ? b.validated.join(", ") : "none"}) will be kept.`)}</p>
        <Field label={t("Orientation souhaitée (facultatif)", "Desired direction (optional)")} htmlFor="guid"><Textarea id="guid" rows={3} value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder={t("Ex. plus minimaliste, plus joyeux, inspiration scandinave…", "E.g. more minimalist, more cheerful, Scandinavian-inspired…")} /></Field>
        <ContentLangPicker {...cl} className="mt-4" />
        <Button
          className="mt-4"
          onClick={async () => {
            try {
              await api(`/api/projects/${id}/brand`, { body: { guidance }, lang: cl.lang });
              setRegen(false);
              setDirty(false);
              toast("ok", t("Nouvelle proposition en cours.", "New proposal in progress."));
              reload();
            } catch (e) {
              toast("bad", (e as Error).message);
            }
          }}
        >
          {t("Lancer", "Start")}
        </Button>
      </Modal>
    </div>
  );
}

type Proposal = {
  id: string;
  key: string;
  label: string;
  concept: string;
  url: string;
  board: string | null;
  route: { name: string; why: string; source: "ai" | "local"; markKind: string; heading: string; body: string; colors: { ink: string; accent: string; ground: string; tint: string }; score: number | null } | null;
  ai: "used" | "unavailable" | "off" | null;
};

/**
 * Présentation des trois pistes, comme en agence : concept nommé, « pourquoi ce logo », typographie et couleurs,
 * planche de mises en situation (avatar, favicon, étiquette, boutique sur téléphone, blanc sur couleur), choix en un clic.
 */
function LogoRoutes({ routes, max, current, choosing, locked, onChoose, onRegenerate, onDelete }: { routes: Proposal[]; max: number; current: string | null; choosing: string | null; locked: boolean; onChoose: (k: string) => void; onRegenerate: () => void; onDelete: (k: string) => void }) {
  const t = useT();
  const [zoom, setZoom] = useState<Proposal | null>(null);
  const anyLocal = routes.some((r) => r.route!.source === "local");
  const aiState = routes[0]?.ai;
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle
        title={t("Pistes créatives du logo", "Logo creative routes")}
        action={
          <div className="flex flex-col items-end gap-1">
            <Button size="sm" variant="ghost" icon={<Sparkles className="size-4" />} loading={choosing === "regenerate"} disabled={locked || !!choosing || routes.length >= max} onClick={onRegenerate}>
              {routes.length >= max ? t("Nouvelles pistes", "New routes") : t(`${max - routes.length > 1 ? "Nouvelles pistes" : "Nouvelle piste"} (+${max - routes.length})`, `New route${max - routes.length > 1 ? "s" : ""} (+${max - routes.length})`)}
            </Button>
            <span className="text-[11px] text-muted">{routes.length >= max ? t(`${routes.length}/${max} pistes : supprimez-en une pour en créer une nouvelle`, `${routes.length}/${max} routes: delete one to create a new one`) : t(`${routes.length}/${max} pistes · les pistes gardées restent`, `${routes.length}/${max} routes · kept routes stay`)}</span>
          </div>
        }
      >
        {routes.length > 1 ? t(`${routes.length} pistes différentes, chacune avec son idée, sa typographie et ses couleurs, présentées en situation. Choisissez celle qui vous ressemble : ses déclinaisons et votre kit réseaux sociaux sont créés aussitôt.`, `${routes.length} different routes, each with its own idea, typeface and colors, shown in real situations. Pick the one that feels like you: its variations and your social media kit are created right away.`) : t("Une piste, avec son idée, sa typographie et ses couleurs, présentée en situation. « Nouvelles pistes » en propose d'autres.", "One route, with its idea, typeface and colors, shown in real situations. \"New routes\" suggests others.")}
      </SectionTitle>
      {anyLocal && (
        <p className="mb-4 rounded-xl border border-line bg-paper-2 p-3 text-xs text-muted" role="note">
          {aiState === "off"
            ? t("Sans IA, les pistes sont construites par le studio (silhouette du produit, monogramme géométrique, logotype) : soignées, mais pas créées sur mesure.", "Without AI, the routes are built by the studio (product silhouette, geometric monogram, wordmark): carefully made, but not custom-designed.")
            : t("Les pistes marquées « version du studio » remplacent une piste de l'IA qui n'a pas passé le contrôle de direction artistique : elles ne sont pas créées sur mesure.", "Routes marked \"studio version\" replace an AI route that failed the art direction review: they aren't custom-designed.")}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-3">
        {routes.map((pr, i) => {
          const r = pr.route!;
          const on = current === pr.id;
          return (
            <div key={pr.id} className={cx("flex flex-col rounded-2xl border p-3", on ? "border-signal ring-2 ring-signal/30" : "border-line")}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{t(`Piste ${String.fromCharCode(65 + i)}`, `Route ${String.fromCharCode(65 + i)}`)} · {pr.key === "produit" ? t("inspirée du produit", "product-inspired") : pr.key === "concept" ? t("conceptuelle", "conceptual") : t("typographique", "typographic")}</p>
              <h4 className="mt-1 font-display text-xl font-semibold">{r.name}</h4>
              <p className="mt-1 text-sm text-ink-2">{r.why}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {r.source === "ai" ? <Badge tone="ok">{t("Création IA contrôlée", "Reviewed AI design")}{r.score != null ? ` · ${r.score.toLocaleString()}/10` : ""}</Badge> : <Badge>{t("Version du studio", "Studio version")}</Badge>}
                <span className="text-[11px] text-muted">{r.heading} + {r.body}</span>
                <span className="ml-auto flex gap-1" aria-label={t("Couleurs de la piste", "Route colors")}>{[r.colors.ink, r.colors.accent, r.colors.ground, r.colors.tint].map((c, k) => <span key={k} className="size-4 rounded-full border border-line" style={{ background: c }} title={c} />)}</span>
              </div>
              <button type="button" onClick={() => setZoom(pr)} className="mt-3 overflow-hidden rounded-xl border border-line bg-paper-2" aria-label={t(`Agrandir la planche de ${r.name}`, `Enlarge the ${r.name} board`)}>
                {pr.board ? <img src={pr.board} alt={t(`Mises en situation : ${r.name}`, `Mockups: ${r.name}`)} className="w-full" loading="lazy" /> : <img src={pr.url} alt={r.name} className="h-40 w-full bg-white object-contain p-4" />}
              </button>
              <div className="mt-3 flex items-center gap-2">
                <Button className="flex-1" size="sm" variant={on ? "secondary" : "primary"} disabled={on || !!choosing || locked} loading={choosing === pr.id} onClick={() => onChoose(pr.id)}>{on ? t("Piste choisie", "Chosen route") : t("Choisir cette piste", "Choose this route")}</Button>
                {!on && (
                  <button type="button" disabled={!!choosing} onClick={() => { if (window.confirm(t(`Supprimer la piste « ${r.name} » ?`, `Delete the "${r.name}" route?`))) onDelete(pr.id); }} className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-bad hover:text-bad disabled:opacity-40" aria-label={t(`Supprimer la piste ${r.name}`, `Delete the ${r.name} route`)} title={t("Supprimer cette piste", "Delete this route")}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {locked && <p className="mt-2 text-[11px] text-muted">{t("Logo validé : déverrouillez-le pour changer de piste.", "Logo approved: unlock it to change routes.")}</p>}
      <Modal open={!!zoom} onClose={() => setZoom(null)} title={zoom?.route?.name ?? ""}>
        {zoom?.board && <img src={zoom.board} alt="" className="w-full rounded-xl" />}
      </Modal>
    </Card>
  );
}

/** Kit réseaux sociaux : visuels aux couleurs de la piste choisie, ligne éditoriale, export PNG et ZIP. */
function SocialKit({ tick }: { tick: number }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<{ kit: { sheet: string; zip: string | null; items: { id: string; item: string; label: string; url: string; download: string }[] } | null; voice: import("@/lib/project-types").SocialVoice | null }>(`/api/projects/${id}/brand/social`);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (tick) reload();
  }, [tick, reload]);
  const redo = async (voice: boolean) => {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/brand/social`, { body: { voice } });
      toast("ok", t("Kit réseaux sociaux mis à jour.", "Social media kit updated."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const kit = data?.kit;
  const v = data?.voice;
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle
        title={t("Kit réseaux sociaux", "Social media kit")}
        action={<div className="flex flex-wrap gap-2">{kit?.zip && <a href={kit.zip} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper"><Download className="size-4" /> ZIP</a>}<Button size="sm" variant="secondary" loading={busy} onClick={() => redo(false)}>{kit ? t("Recréer", "Recreate") : t("Créer le kit", "Create the kit")}</Button></div>}
      >
        {t("Photo de profil, stories à la une, modèles de publication et bannières, aux couleurs et typographies de la piste choisie. Les textes entre crochets sont à compléter avec des faits réels.", "Profile picture, highlight covers, post templates and banners, in the chosen route's colors and typefaces. Text in brackets must be completed with real facts.")}
      </SectionTitle>
      {kit ? (
        <>
          <img src={kit.sheet} alt={t("Aperçu du kit", "Kit preview")} className="w-full rounded-2xl border border-line" />
          <div className="mt-3 flex flex-wrap gap-2">
            {kit.items.map((it) => <a key={it.id} href={it.download} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink"><Download className="size-3.5" /> {it.label}</a>)}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">{t("Le kit apparaît dès qu'une piste de logo est choisie.", "The kit appears as soon as a logo route is chosen.")}</p>
      )}
      {v && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Piliers de contenu", "Content pillars")}</p>
            <ol className="mt-2 grid gap-2 text-sm">{v.pillars.map((p, i) => <li key={i}><strong>{p.title}</strong> <span className="text-ink-2">— {p.idea}</span></li>)}</ol>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted">Emojis</p>
            <p className="mt-1 text-sm">{v.emoji === "none" ? t("Aucun emoji.", "No emoji.") : v.emoji === "sparing" ? t("Un au plus par légende, jamais à la place d'un mot.", "One at most per caption, never instead of a word.") : t("Libres, avec goût.", "Welcome, with taste.")} {v.emojis.join(" ")}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Ce qu'on dit", "What we say")}</p>
            <ul className="mt-2 grid gap-1.5 text-sm">{v.say.map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{s}</li>)}</ul>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted">{t("Ce qu'on ne dit pas", "What we don't say")}</p>
            <ul className="mt-2 grid gap-1.5 text-sm text-ink-2">{v.dontSay.map((s) => <li key={s}>— {s}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("Exemples de légendes", "Sample captions")}</p>
            <div className="mt-2 grid gap-2">{v.captions.map((c, i) => <div key={i} className="rounded-xl bg-paper-2 p-3 text-sm"><p className="text-[11px] font-medium text-muted">{c.pillar}</p><p className="mt-1 whitespace-pre-line">{c.text}</p></div>)}</div>
            <Button size="sm" variant="ghost" className="mt-2" icon={<Sparkles className="size-4" />} loading={busy} onClick={() => redo(true)}>{t("Refaire la ligne éditoriale", "Redo the editorial line")}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Charte de marque mise en page : planches, PDF, régénération. */
function BrandBook() {
  const { id } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const { data, reload } = useApi<{ book: { pdf: string; pages: string[]; createdAt: number } | null }>(`/api/projects/${id}/brand/book`);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const book = data?.book;
  const refresh = async () => {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/brand/book`, { body: {}, lang: cl.lang });
      toast("ok", t("Charte mise à jour avec vos derniers choix.", "Brand guidelines updated with your latest choices."));
      setI(0);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">{t("Charte de marque", "Brand guidelines")}</h3>
        {book && <span className="text-xs text-muted">{t(`${book.pages.length} planches`, `${book.pages.length} pages`)}</span>}
      </div>
      <p className="mt-1 text-xs text-muted">{t("Logo et usages, couleurs (HEX, RVB, CMJN, contrastes), typographies, ton, applications.", "Logo and usage, colors (HEX, RGB, CMYK, contrast), typography, tone, applications.")}</p>
      {book ? (
        <>
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-line bg-paper-2">
            <img src={book.pages[i]} alt={t(`Planche ${i + 1}`, `Page ${i + 1}`)} className="aspect-[1.414] w-full object-contain" />
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
              <button onClick={() => setI((i + book.pages.length - 1) % book.pages.length)} className="grid size-8 place-items-center rounded-full bg-card/90 text-sm shadow-soft" aria-label={t("Planche précédente", "Previous page")}>‹</button>
              <span className="rounded-full bg-card/90 px-2.5 py-1 text-xs">{i + 1} / {book.pages.length}</span>
              <button onClick={() => setI((i + 1) % book.pages.length)} className="grid size-8 place-items-center rounded-full bg-card/90 text-sm shadow-soft" aria-label={t("Planche suivante", "Next page")}>›</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={book.pdf} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper"><Download className="size-4" /> PDF</a>
            <Button size="sm" variant="secondary" loading={busy} onClick={refresh}>{t("Mettre à jour", "Update")}</Button>
            <ContentLangPicker {...cl} compact />
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" loading={busy} onClick={refresh}>{t("Créer la charte", "Create brand guidelines")}</Button>
          <ContentLangPicker {...cl} compact />
        </div>
      )}
    </Card>
  );
}


/** Liste éditable, un élément par ligne (texte libre gardé tel quel pendant la saisie, lignes vides ignorées). */
function LinesArea({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  const clean = (s: string) => s.split(/\n|;/).map((x) => x.trim()).filter(Boolean);
  // Valeur changée ailleurs (nouvelle proposition de marque) : on la reprend.
  useEffect(() => {
    if (clean(text).join("\n") !== value.join("\n")) setText(value.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join("\n")]);
  return <Textarea autoGrow rows={2} id={id} value={text} onChange={(e) => { setText(e.target.value); onChange(clean(e.target.value)); }} />;
}
