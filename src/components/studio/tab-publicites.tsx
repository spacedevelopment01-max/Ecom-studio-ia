"use client";
import { useState } from "react";
import { Download, Megaphone, Plus, Send, Trash2, Wand2 } from "lucide-react";
import { api, Badge, Button, Card, Empty, Field, Input, Modal, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, MediaPicker, type AssetView } from "./common";
import { NETWORKS } from "./post-editor";
import { useT } from "../i18n";
import { ContentLangPicker } from "./content-lang";
import { pick, type Lang } from "@/lib/i18n";

type Ad = { angle: string; primary: string; headline: string; cta: string; media: AssetView[] };
type Campaign = { id: string; name: string; objective: string; networks: string[]; status: string; brief: { audience?: string; budgetNote?: string; kpis?: string; language?: Lang }; plan: { ads?: Ad[] }; posts: { id: string; network: string; status: string }[] };

/** Objectifs : la valeur enregistrée reste le libellé français (campagnes existantes), affichée selon la langue. */
const OBJECTIVES: [string, string][] = [
  ["Notoriété", "Awareness"],
  ["Trafic vers la boutique", "Store traffic"],
  ["Ventes", "Sales"],
  ["Interactions", "Engagement"],
  ["Lancement de produit", "Product launch"],
];
/** Boutons d'appel à l'action selon la langue de la campagne (même ordre ; identique à src/lib/engine/ads.ts). */
const CTAS: Record<Lang, string[]> = {
  fr: ["Découvrir", "Acheter", "En savoir plus", "Voir le produit", "S'inscrire"],
  en: ["Discover", "Shop now", "Learn more", "View product", "Sign up"],
};
const objectiveIn = (o: string, lang: Lang) => pick(lang, o, OBJECTIVES.find(([fr]) => fr === o)?.[1] ?? o);
/** Bouton équivalent dans l'autre langue (même position dans la liste). */
const ctaIn = (cta: string, lang: Lang) => {
  const i = Math.max(CTAS.fr.indexOf(cta), CTAS.en.indexOf(cta));
  return i >= 0 ? CTAS[lang][i] : cta;
};

export default function TabPublicites() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const projectLang: Lang = data?.settings.language ?? "fr";
  const { data: list, reload } = useApi<{ campaigns: Campaign[] }>(`/api/projects/${id}/campaigns`);
  const [edit, setEdit] = useState<Campaign | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const [drafting, setDrafting] = useState(false);
  const langOf = (c: Campaign): Lang => c.brief.language ?? projectLang;
  const blank = (): Campaign => ({
    id: "",
    name: `${t("Lancement", "Launch")} · ${data?.brand?.name ?? data?.project.name ?? ""}`,
    objective: "Trafic vers la boutique",
    networks: ["instagram", "facebook"],
    status: "draft",
    brief: { audience: data?.brand?.audience ?? "", budgetNote: "", kpis: t("Taux de clic, coût par clic, ajouts au panier", "Click-through rate, cost per click, add-to-carts"), language: projectLang },
    plan: { ads: (data?.strategy?.angles ?? [{ title: pick(projectLang, "Le produit", "The product"), idea: "" }]).slice(0, 3).map((a) => ({ angle: a.title, primary: a.idea, headline: data?.brand?.tagline ?? "", cta: CTAS[projectLang][0], media: [] })) },
    posts: [],
  });
  const save = async (c: Campaign) => {
    try {
      const r = await api<{ id: string }>(`/api/projects/${id}/campaigns`, { body: { id: c.id || undefined, name: c.name, objective: c.objective, networks: c.networks, brief: { ...c.brief, language: langOf(c) }, plan: { ads: (c.plan.ads ?? []).map((a) => ({ ...a, media: a.media.map((m) => ({ id: m.id, name: m.name, url: m.url, thumbUrl: m.thumbUrl, kind: m.kind, meta: { format: m.meta?.format } })) })) }, status: c.status } });
      toast("ok", t("Campagne enregistrée.", "Campaign saved."));
      reload();
      return r.id;
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const toPosts = async (c: Campaign) => {
    const cid = await save(c);
    if (!cid) return;
    let n = 0;
    for (const ad of c.plan.ads ?? []) for (const net of c.networks) {
      await api(`/api/projects/${id}/posts`, { body: { network: net, format: ad.media[0]?.kind === "video" ? (net === "youtube" ? "short" : "reel") : net === "pinterest" ? "pin" : "image", title: ad.headline, caption: `${ad.primary}\n\n${ad.cta}`, media: ad.media.map((m) => m.id), campaignId: cid }, lang: langOf(c) });
      n++;
    }
    toast("ok", t(`${n} publication(s) créée(s) en brouillon dans l'espace Publications.`, `${n} post(s) created as drafts in the Posts area.`));
    reload();
  };
  const exportCsv = (c: Campaign) => {
    const lang = langOf(c);
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [pick(lang, ["Campagne", "Objectif", "Réseau", "Angle", "Texte principal", "Titre", "Bouton", "Médias"], ["Campaign", "Objective", "Network", "Angle", "Primary text", "Headline", "Call to action", "Media"]).join(",")];
    for (const ad of c.plan.ads ?? []) for (const net of c.networks) rows.push([c.name, objectiveIn(c.objective, lang), NETWORKS[net]?.label ?? net, ad.angle, ad.primary, ad.headline, ad.cta, ad.media.map((m) => m.name).join(" ")].map(esc).join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${pick(lang, "annonces", "ads")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  /** Langue de la campagne : les boutons passent dans la langue choisie ; les textes se proposent avec « Proposer les annonces… ». */
  const setLanguage = (c: Campaign, lang: Lang) => setEdit({ ...c, brief: { ...c.brief, language: lang }, plan: { ads: (c.plan.ads ?? []).map((a) => ({ ...a, cta: ctaIn(a.cta, lang) })) } });
  const draft = async (c: Campaign) => {
    const lang = langOf(c);
    const current = c.plan.ads ?? [];
    setDrafting(true);
    try {
      const r = await api<{ ads: { angle: string; primary: string; headline: string; cta: string }[]; by: "ai" | "local" }>(`/api/projects/${id}/campaigns/draft`, { body: { count: Math.max(1, Math.min(6, current.length || 3)), objective: objectiveIn(c.objective, lang), audience: c.brief.audience || undefined }, lang });
      // Les créations déjà choisies restent attachées aux annonces (même position).
      setEdit((e) => e && { ...e, plan: { ads: r.ads.map((a, i) => ({ ...a, media: current[i]?.media ?? [] })) } });
      toast("ok", r.by === "ai" ? t("Annonces proposées : relisez-les avant d'enregistrer.", "Ads drafted: review them before saving.") : t("Annonces proposées à partir des faits du produit (moteur local) : complétez les passages entre crochets.", "Ads drafted from the product facts (local engine): fill in the bracketed parts."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setDrafting(false);
    }
  };
  const editLang = edit ? langOf(edit) : projectLang;
  const ctaOptions = (cur: string) => (CTAS[editLang].includes(cur) || !cur ? CTAS[editLang] : [cur, ...CTAS[editLang]]);
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-line bg-card p-4 text-sm text-ink-2">
        {t("Le studio prépare vos campagnes : angles, audiences, textes et créations aux bons formats.", "The studio prepares your campaigns: angles, audiences, copy and creatives in the right formats.")} <strong className="text-ink">{t("Aucune dépense publicitaire n'est engagée depuis le studio", "No ad spend is committed from the studio")}</strong>{t(" : le budget et le lancement se règlent dans le gestionnaire de publicités de chaque réseau, avec l'export ci-dessous.", ": budget and launch are set in each network's ads manager, using the export below.")}
      </div>
      <div className="flex justify-end"><Button variant="signal" icon={<Plus className="size-4" />} onClick={() => setEdit(blank())}>{t("Nouvelle campagne", "New campaign")}</Button></div>
      {(list?.campaigns ?? []).length === 0 ? (
        <Empty title={t("Aucune campagne", "No campaigns")} icon={<Megaphone className="size-5" />}>{t("Créez une campagne : les angles de votre stratégie de marque sont proposés comme point de départ.", "Create a campaign: the angles from your brand strategy are suggested as a starting point.")}</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list!.campaigns.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold">{c.name}</p>
                  <p className="text-sm text-muted">{t(c.objective, objectiveIn(c.objective, "en"))} · {c.networks.map((n) => NETWORKS[n]?.label).join(", ")} · {langOf(c).toUpperCase()}</p>
                </div>
                <Badge tone={c.status === "ready" ? "ok" : "neutral"}>{c.status === "ready" ? t("Prête", "Ready") : t("Brouillon", "Draft")}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                {(c.plan.ads ?? []).flatMap((a) => a.media).slice(0, 5).map((m, i) => <img key={i} src={m.thumbUrl ?? m.url} alt="" className="size-14 rounded-xl object-cover" />)}
              </div>
              <p className="mt-3 text-xs text-muted">{t(`${(c.plan.ads ?? []).length} annonce(s) · ${c.posts.length} publication(s) liée(s)`, `${(c.plan.ads ?? []).length} ad(s) · ${c.posts.length} linked post(s)`)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEdit(c)}>{t("Ouvrir", "Open")}</Button>
                <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => exportCsv(c)}>{t("Export pour le gestionnaire de publicités", "Export for the ads manager")}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? t("Campagne", "Campaign") : t("Nouvelle campagne", "New campaign")} wide>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Nom", "Name")} htmlFor="cname"><Input id="cname" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label={t("Objectif", "Objective")} htmlFor="cobj"><Select id="cobj" value={edit.objective} onChange={(e) => setEdit({ ...edit, objective: e.target.value })}>{(OBJECTIVES.some(([fr]) => fr === edit.objective) ? OBJECTIVES : [[edit.objective, edit.objective] as [string, string], ...OBJECTIVES]).map(([fr, en]) => <option key={fr} value={fr}>{t(fr, en)}</option>)}</Select></Field>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.keys(NETWORKS).map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.networks.includes(n)} onChange={(e) => setEdit({ ...edit, networks: e.target.checked ? [...edit.networks, n] : edit.networks.filter((x) => x !== n) })} className="size-4 accent-[var(--signal)]" /> {NETWORKS[n].label}</label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Audience", "Audience")} htmlFor="caud"><Textarea id="caud" rows={2} value={edit.brief.audience ?? ""} onChange={(e) => setEdit({ ...edit, brief: { ...edit.brief, audience: e.target.value } })} /></Field>
              <Field label={t("Indicateurs suivis", "Tracked metrics")} htmlFor="ckpi"><Textarea id="ckpi" rows={2} value={edit.brief.kpis ?? ""} onChange={(e) => setEdit({ ...edit, brief: { ...edit.brief, kpis: e.target.value } })} /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-paper-2 p-3">
              <ContentLangPicker lang={editLang} setLang={(l) => setLanguage(edit, l)} projectLang={projectLang} />
              <Button size="sm" variant="secondary" icon={<Wand2 className="size-3.5" />} loading={drafting} onClick={() => draft(edit)}>{t("Proposer les annonces dans cette langue", "Draft ads in this language")}</Button>
              <p className="w-full text-[11px] text-muted">{t("Annonces, boutons, export et publications de cette campagne sont dans cette langue, même si le reste du projet est dans une autre.", "This campaign's ads, buttons, export and posts use this language, even if the rest of the project uses another.")}</p>
            </div>
            <p className="text-sm font-medium">{t("Annonces", "Ads")}</p>
            {(edit.plan.ads ?? []).map((ad, i) => (
              <Card key={i} className="grid gap-3 p-4 sm:grid-cols-[1fr_200px]">
                <div className="grid gap-2" lang={editLang}>
                  <Input value={ad.angle} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, angle: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} placeholder={t("Angle", "Angle")} aria-label={t("Angle", "Angle")} />
                  <Textarea rows={3} value={ad.primary} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, primary: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} placeholder={t("Texte principal (faits confirmés uniquement)", "Primary text (confirmed facts only)")} aria-label={t("Texte principal", "Primary text")} />
                  <div className="grid grid-cols-[1fr_160px] gap-2">
                    <Input value={ad.headline} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, headline: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} placeholder={t("Titre", "Headline")} aria-label={t("Titre", "Headline")} />
                    <Select value={ad.cta} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, cta: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} aria-label={t("Bouton", "Call to action")}>{ctaOptions(ad.cta).map((c) => <option key={c}>{c}</option>)}</Select>
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {ad.media.map((m) => <AssetThumb key={m.id} a={m} className="size-14 rounded-xl" />)}
                    <button onClick={() => setPicker(i)} className="grid size-14 place-items-center rounded-xl border border-dashed border-line" aria-label={t("Choisir des créations", "Choose creatives")}><Plus className="size-4" /></button>
                  </div>
                  <button onClick={() => setEdit({ ...edit, plan: { ads: edit.plan.ads!.filter((_, k) => k !== i) } })} className="mt-2 inline-flex items-center gap-1 text-xs text-muted"><Trash2 className="size-3" /> {t("Retirer l'annonce", "Remove ad")}</button>
                </div>
              </Card>
            ))}
            <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => setEdit({ ...edit, plan: { ads: [...(edit.plan.ads ?? []), { angle: "", primary: "", headline: "", cta: CTAS[editLang][0], media: [] }] } })} className="justify-self-start">{t("Ajouter une annonce", "Add an ad")}</Button>
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button onClick={async () => { await save(edit); setEdit(null); }}>{t("Enregistrer", "Save")}</Button>
              <Button variant="secondary" icon={<Send className="size-4" />} onClick={async () => { await toPosts(edit); setEdit(null); }}>{t("Créer les publications organiques", "Create organic posts")}</Button>
              <Button variant="ghost" icon={<Download className="size-4" />} onClick={() => exportCsv(edit)}>{t("Exporter (CSV)", "Export (CSV)")}</Button>
            </div>
          </div>
          <MediaPicker open={picker !== null} onClose={() => setPicker(null)} multiple kinds={["image", "video"]} onPick={(m) => { if (picker === null) return; const ads = [...edit.plan.ads!]; ads[picker] = { ...ads[picker], media: [...ads[picker].media, ...m] }; setEdit({ ...edit, plan: { ads } }); }} />
        </Modal>
      )}
    </div>
  );
}
