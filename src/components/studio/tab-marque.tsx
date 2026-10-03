"use client";
import { useEffect, useState } from "react";
import { Check, Download, Lock, Sparkles, Unlock } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, JobProgress, SectionTitle, useActive, type AssetView } from "./common";
import type { Brand } from "@/lib/project-types";
import { DIRECTIONS } from "@/lib/theme/directions";

const PALETTE_LABEL: Record<string, string> = { primary: "Principale", secondary: "Secondaire", accent: "Accent", light: "Clair", dark: "Sombre" };

export default function TabMarque() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const [b, setB] = useState<Brand | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [regen, setRegen] = useState(false);
  const [guidance, setGuidance] = useState("");
  const active = useActive("brand.build");
  const { data: logos, reload: reloadLogos } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=logo,logo-svg,logo-light,logo-light-svg,logo-mark,logo-mark-svg,favicon,brand-guide`);
  useEffect(() => {
    if (data?.brand && !dirty) setB(data.brand);
  }, [data?.brand, dirty]);
  useEffect(() => {
    if (!active.length) reloadLogos();
  }, [active.length, reloadLogos]);
  if (!data) return null;
  if (!b) return <div className="mx-auto max-w-3xl"><JobProgress job={active[0]} className="mb-6" /><Empty title="La marque n'est pas encore créée" icon={<Sparkles className="size-5" />}>Elle apparaît ici dès que l'analyse du produit est terminée.</Empty></div>;
  const set = (patch: Partial<Brand>) => (setB({ ...b, ...patch }), setDirty(true));
  const validated = new Set(b.validated);
  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/brand`, { method: "PATCH", body: { name: b!.name, tagline: b!.tagline, positioning: b!.positioning, audience: b!.audience, story: b!.story, tone: b!.tone, palette: b!.palette, direction: b!.direction, ...extra } });
      toast("ok", "Marque enregistrée. Les prochaines créations utiliseront ces choix.");
      setDirty(false);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const toggleValid = (key: string) => save(validated.has(key) ? { unvalidate: [key] } : { validate: [key] });
  const V = ({ k }: { k: string }) => (
    <button onClick={() => toggleValid(k)} className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", validated.has(k) ? "bg-ok-soft text-ok" : "bg-paper-2 text-muted hover:text-ink")} title={validated.has(k) ? "Validé : conservé lors des nouvelles propositions" : "Valider pour le conserver"}>
      {validated.has(k) ? <Lock className="size-3" /> : <Unlock className="size-3" />} {validated.has(k) ? "Validé" : "Valider"}
    </button>
  );
  const byRole = (r: string) => (logos?.assets ?? []).find((a) => a.role === r);
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <EngineNotice what="la direction de marque et le logo" />
      {active[0] && <JobProgress job={active[0]} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-7">
          <SectionTitle title="Identité" action={<div className="flex gap-2"><Button variant="secondary" size="sm" icon={<Sparkles className="size-4" />} onClick={() => setRegen(true)}>Nouvelle proposition</Button><Button size="sm" onClick={() => save()} loading={busy} disabled={!dirty}>Enregistrer</Button></div>}>
            {b.generatedBy === "ai" ? "Proposée par l'IA à partir du produit." : "Base proposée par le moteur local : à affiner."} Les éléments validés sont conservés lors des nouvelles propositions.
          </SectionTitle>
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between"><label htmlFor="bname" className="text-sm font-medium">Nom de marque</label><V k="name" /></div>
              <Input id="bname" value={b.name} onChange={(e) => set({ name: e.target.value })} className="font-display text-xl" />
              {b.alternatives.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted">Autres pistes :</span>
                  {b.alternatives.map((n) => <button key={n} onClick={() => set({ name: n })} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">{n}</button>)}
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between"><label htmlFor="btag" className="text-sm font-medium">Signature</label><V k="tagline" /></div>
              <Input id="btag" value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Une phrase courte, sans promesse invérifiable" />
            </div>
            <Field label="Positionnement" htmlFor="bpos"><Textarea id="bpos" rows={3} value={b.positioning} onChange={(e) => set({ positioning: e.target.value })} /></Field>
            <Field label="Cible" htmlFor="baud"><Textarea id="baud" rows={2} value={b.audience} onChange={(e) => set({ audience: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Voix" htmlFor="bvoice"><Input id="bvoice" value={b.tone.voice} onChange={(e) => set({ tone: { ...b.tone, voice: e.target.value } })} /></Field>
              <Field label="À faire" htmlFor="bdo"><Input id="bdo" value={b.tone.do.join(" ; ")} onChange={(e) => set({ tone: { ...b.tone, do: e.target.value.split(";").map((x) => x.trim()).filter(Boolean) } })} /></Field>
              <Field label="À éviter" htmlFor="bdont"><Input id="bdont" value={b.tone.dont.join(" ; ")} onChange={(e) => set({ tone: { ...b.tone, dont: e.target.value.split(";").map((x) => x.trim()).filter(Boolean) } })} /></Field>
            </div>
            <Field label="Histoire de la marque" htmlFor="bstory" hint="N'écrivez que des faits réels (origine, fondateurs, fabrication)."><Textarea id="bstory" rows={4} value={b.story} onChange={(e) => set({ story: e.target.value })} /></Field>
            <div>
              <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">Palette</p><V k="palette" /></div>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(b.palette) as (keyof Brand["palette"])[]).map((k) => (
                  <label key={k} className="grid gap-1.5 text-center text-xs">
                    <span className="relative h-16 overflow-hidden rounded-2xl border border-line" style={{ background: b.palette[k] }}>
                      <input type="color" value={b.palette[k]} onChange={(e) => set({ palette: { ...b.palette, [k]: e.target.value.toUpperCase() } })} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={`Couleur ${PALETTE_LABEL[k]}`} />
                    </span>
                    <span className="text-muted">{PALETTE_LABEL[k]}</span>
                    <span className="font-mono text-[10px]">{b.palette[k]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <div className="grid content-start gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Logo</h3><V k="logo" /></div>
            <p className="mt-1 text-xs text-muted">{b.logo.concept}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {byRole("logo") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("logo")!.url} alt="Logo principal" className="max-h-20 object-contain" /></div>}
              {byRole("logo-light") && <div className="grid place-items-center rounded-2xl bg-[#141210] p-4"><img src={byRole("logo-light")!.url} alt="Logo clair" className="max-h-20 object-contain" /></div>}
              {byRole("logo-mark") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("logo-mark")!.url} alt="Monogramme" className="max-h-20 object-contain" /></div>}
              {byRole("favicon") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("favicon")!.url} alt="Favicon" className="size-12 object-contain" /></div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["logo-svg", "logo", "logo-light-svg", "logo-mark-svg", "favicon"].map((r) => byRole(r) && (
                <a key={r} href={byRole(r)!.downloadUrl} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink"><Download className="size-3.5" /> {byRole(r)!.name}</a>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold">Direction de la boutique</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DIRECTIONS.map((d) => (
                <button key={d.id} onClick={() => set({ direction: d.id })} className={cx("overflow-hidden rounded-2xl border text-left transition", b.direction === d.id ? "border-signal ring-2 ring-signal" : "border-line hover:border-ink")} aria-pressed={b.direction === d.id}>
                  <img src={`/demo/directions/${d.id}.jpg`} alt="" className="aspect-[4/3] w-full object-cover object-top" loading="lazy" />
                  <span className="block px-2.5 py-1.5 text-xs font-medium">{d.name} <span className="text-muted">· {d.tagline}</span></span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Enregistrez puis appliquez la direction depuis l'espace Boutique (une nouvelle version est créée, l'ancienne reste restaurable).</p>
          </Card>
          {byRole("brand-guide") && (
            <a href={byRole("brand-guide")!.downloadUrl} className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-4 py-3 text-sm hover:border-ink"><Download className="size-4" /> Télécharger la charte (Markdown)</a>
          )}
        </div>
      </div>
      {data.strategy && (
        <Card className="p-5 sm:p-7">
          <SectionTitle title="Stratégie">Angles et messages réutilisés pour les publications et les campagnes.</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">Messages clés</p><ul className="mt-2 grid gap-1.5 text-sm">{data.strategy.keyMessages.map((m) => <li key={m} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{m}</li>)}</ul></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">Angles</p><ul className="mt-2 grid gap-2 text-sm">{data.strategy.angles.map((a) => <li key={a.title}><strong>{a.title}</strong> — <span className="text-ink-2">{a.idea}</span></li>)}</ul></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">Piliers</p><div className="mt-2 flex flex-wrap gap-1.5">{data.strategy.pillars.map((p) => <Badge key={p}>{p}</Badge>)}</div></div>
          </div>
        </Card>
      )}
      <Modal open={regen} onClose={() => setRegen(false)} title="Nouvelle proposition de marque">
        <p className="text-sm text-muted">Les éléments validés ({b.validated.length ? b.validated.join(", ") : "aucun"}) seront conservés.</p>
        <Field label="Orientation souhaitée (facultatif)" htmlFor="guid"><Textarea id="guid" rows={3} value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder="Ex. plus minimaliste, plus joyeux, inspiration scandinave…" /></Field>
        <Button
          className="mt-4"
          onClick={async () => {
            try {
              await api(`/api/projects/${id}/brand`, { body: { guidance } });
              setRegen(false);
              setDirty(false);
              toast("ok", "Nouvelle proposition en cours.");
              reload();
            } catch (e) {
              toast("bad", (e as Error).message);
            }
          }}
        >
          Lancer
        </Button>
      </Modal>
    </div>
  );
}
