"use client";
import { useState } from "react";
import { Download, Megaphone, Plus, Send, Trash2 } from "lucide-react";
import { api, Badge, Button, Card, Empty, Field, Input, Modal, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, MediaPicker, type AssetView } from "./common";
import { NETWORKS } from "./post-editor";

type Ad = { angle: string; primary: string; headline: string; cta: string; media: AssetView[] };
type Campaign = { id: string; name: string; objective: string; networks: string[]; status: string; brief: { audience?: string; budgetNote?: string; kpis?: string }; plan: { ads?: Ad[] }; posts: { id: string; network: string; status: string }[] };

const OBJECTIVES = ["Notoriété", "Trafic vers la boutique", "Ventes", "Interactions", "Lancement de produit"];
const CTAS = ["Découvrir", "Acheter", "En savoir plus", "Voir le produit", "S'inscrire"];

export default function TabPublicites() {
  const { id, data } = useProject();
  const toast = useToast();
  const { data: list, reload } = useApi<{ campaigns: Campaign[] }>(`/api/projects/${id}/campaigns`);
  const [edit, setEdit] = useState<Campaign | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const blank = (): Campaign => ({
    id: "",
    name: `Lancement · ${data?.brand?.name ?? data?.project.name ?? ""}`,
    objective: "Trafic vers la boutique",
    networks: ["instagram", "facebook"],
    status: "draft",
    brief: { audience: data?.brand?.audience ?? "", budgetNote: "", kpis: "Taux de clic, coût par clic, ajouts au panier" },
    plan: { ads: (data?.strategy?.angles ?? [{ title: "Le produit", idea: "" }]).slice(0, 3).map((a) => ({ angle: a.title, primary: a.idea, headline: data?.brand?.tagline ?? "", cta: "Découvrir", media: [] })) },
    posts: [],
  });
  const save = async (c: Campaign) => {
    try {
      const r = await api<{ id: string }>(`/api/projects/${id}/campaigns`, { body: { id: c.id || undefined, name: c.name, objective: c.objective, networks: c.networks, brief: c.brief, plan: { ads: (c.plan.ads ?? []).map((a) => ({ ...a, media: a.media.map((m) => ({ id: m.id, name: m.name, url: m.url, thumbUrl: m.thumbUrl, kind: m.kind, meta: { format: m.meta?.format } })) })) }, status: c.status } });
      toast("ok", "Campagne enregistrée.");
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
      await api(`/api/projects/${id}/posts`, { body: { network: net, format: ad.media[0]?.kind === "video" ? (net === "youtube" ? "short" : "reel") : net === "pinterest" ? "pin" : "image", title: ad.headline, caption: `${ad.primary}\n\n${ad.cta}`, media: ad.media.map((m) => m.id), campaignId: cid } });
      n++;
    }
    toast("ok", `${n} publication(s) créée(s) en brouillon dans l'espace Publications.`);
    reload();
  };
  const exportCsv = (c: Campaign) => {
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Campagne", "Objectif", "Réseau", "Angle", "Texte principal", "Titre", "Bouton", "Médias"].join(",")];
    for (const ad of c.plan.ads ?? []) for (const net of c.networks) rows.push([c.name, c.objective, NETWORKS[net]?.label ?? net, ad.angle, ad.primary, ad.headline, ad.cta, ad.media.map((m) => m.name).join(" ")].map(esc).join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-annonces.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-line bg-card p-4 text-sm text-ink-2">
        Le studio prépare vos campagnes : angles, audiences, textes et créations aux bons formats. <strong className="text-ink">Aucune dépense publicitaire n'est engagée depuis le studio</strong> : le budget et le lancement se règlent dans le gestionnaire de publicités de chaque réseau, avec l'export ci-dessous.
      </div>
      <div className="flex justify-end"><Button variant="signal" icon={<Plus className="size-4" />} onClick={() => setEdit(blank())}>Nouvelle campagne</Button></div>
      {(list?.campaigns ?? []).length === 0 ? (
        <Empty title="Aucune campagne" icon={<Megaphone className="size-5" />}>Créez une campagne : les angles de votre stratégie de marque sont proposés comme point de départ.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list!.campaigns.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold">{c.name}</p>
                  <p className="text-sm text-muted">{c.objective} · {c.networks.map((n) => NETWORKS[n]?.label).join(", ")}</p>
                </div>
                <Badge tone={c.status === "ready" ? "ok" : "neutral"}>{c.status === "ready" ? "Prête" : "Brouillon"}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                {(c.plan.ads ?? []).flatMap((a) => a.media).slice(0, 5).map((m, i) => <img key={i} src={m.thumbUrl ?? m.url} alt="" className="size-14 rounded-xl object-cover" />)}
              </div>
              <p className="mt-3 text-xs text-muted">{(c.plan.ads ?? []).length} annonce(s) · {c.posts.length} publication(s) liée(s)</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEdit(c)}>Ouvrir</Button>
                <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => exportCsv(c)}>Export pour le gestionnaire de publicités</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? "Campagne" : "Nouvelle campagne"} wide>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom" htmlFor="cname"><Input id="cname" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Objectif" htmlFor="cobj"><Select id="cobj" value={edit.objective} onChange={(e) => setEdit({ ...edit, objective: e.target.value })}>{OBJECTIVES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.keys(NETWORKS).map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.networks.includes(n)} onChange={(e) => setEdit({ ...edit, networks: e.target.checked ? [...edit.networks, n] : edit.networks.filter((x) => x !== n) })} className="size-4 accent-[var(--signal)]" /> {NETWORKS[n].label}</label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Audience" htmlFor="caud"><Textarea id="caud" rows={2} value={edit.brief.audience ?? ""} onChange={(e) => setEdit({ ...edit, brief: { ...edit.brief, audience: e.target.value } })} /></Field>
              <Field label="Indicateurs suivis" htmlFor="ckpi"><Textarea id="ckpi" rows={2} value={edit.brief.kpis ?? ""} onChange={(e) => setEdit({ ...edit, brief: { ...edit.brief, kpis: e.target.value } })} /></Field>
            </div>
            <p className="text-sm font-medium">Annonces</p>
            {(edit.plan.ads ?? []).map((ad, i) => (
              <Card key={i} className="grid gap-3 p-4 sm:grid-cols-[1fr_200px]">
                <div className="grid gap-2">
                  <Input value={ad.angle} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, angle: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} placeholder="Angle" aria-label="Angle" />
                  <Textarea rows={3} value={ad.primary} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, primary: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} placeholder="Texte principal (faits confirmés uniquement)" aria-label="Texte principal" />
                  <div className="grid grid-cols-[1fr_160px] gap-2">
                    <Input value={ad.headline} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, headline: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} placeholder="Titre" aria-label="Titre" />
                    <Select value={ad.cta} onChange={(e) => { const ads = [...edit.plan.ads!]; ads[i] = { ...ad, cta: e.target.value }; setEdit({ ...edit, plan: { ads } }); }} aria-label="Bouton">{CTAS.map((c) => <option key={c}>{c}</option>)}</Select>
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {ad.media.map((m) => <AssetThumb key={m.id} a={m} className="size-14 rounded-xl" />)}
                    <button onClick={() => setPicker(i)} className="grid size-14 place-items-center rounded-xl border border-dashed border-line" aria-label="Choisir des créations"><Plus className="size-4" /></button>
                  </div>
                  <button onClick={() => setEdit({ ...edit, plan: { ads: edit.plan.ads!.filter((_, k) => k !== i) } })} className="mt-2 inline-flex items-center gap-1 text-xs text-muted"><Trash2 className="size-3" /> Retirer l'annonce</button>
                </div>
              </Card>
            ))}
            <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => setEdit({ ...edit, plan: { ads: [...(edit.plan.ads ?? []), { angle: "", primary: "", headline: "", cta: "Découvrir", media: [] }] } })} className="justify-self-start">Ajouter une annonce</Button>
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button onClick={async () => { await save(edit); setEdit(null); }}>Enregistrer</Button>
              <Button variant="secondary" icon={<Send className="size-4" />} onClick={async () => { await toPosts(edit); setEdit(null); }}>Créer les publications organiques</Button>
              <Button variant="ghost" icon={<Download className="size-4" />} onClick={() => exportCsv(edit)}>Exporter (CSV)</Button>
            </div>
          </div>
          <MediaPicker open={picker !== null} onClose={() => setPicker(null)} multiple kinds={["image", "video"]} onPick={(m) => { if (picker === null) return; const ads = [...edit.plan.ads!]; ads[picker] = { ...ads[picker], media: [...ads[picker].media, ...m] }; setEdit({ ...edit, plan: { ads } }); }} />
        </Modal>
      )}
    </div>
  );
}
