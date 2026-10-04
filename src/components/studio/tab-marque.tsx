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
  const { data: logos, reload: reloadLogos } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=logo,logo-svg,logo-light,logo-light-svg,logo-mark,logo-mark-svg,logo-horizontal,logo-horizontal-svg,favicon,brand-guide,brand-book`);
  const { data: ident, reload: reloadIdent } = useApi<{ proposals: { id: string; key: string; label: string; concept: string; url: string }[]; current: string | null; provided: boolean; taglines: string[] }>(`/api/projects/${id}/brand/logo`);
  const [choosing, setChoosing] = useState<string | null>(null);
  const chooseLogo = async (b: { choice?: string; regenerate?: boolean }) => {
    setChoosing(b.choice ?? "regenerate");
    try {
      await api(`/api/projects/${id}/brand/logo`, { body: b });
      toast("ok", b.regenerate ? "Nouvelles propositions de logo prêtes." : "Logo appliqué : déclinaisons créées et boutique mise à jour (nouvelle version).");
      reloadIdent();
      reloadLogos();
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setChoosing(null);
    }
  };
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
  const V = (k: string) => (
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
              <div className="flex items-center justify-between"><label htmlFor="bname" className="text-sm font-medium">Nom de marque</label>{V("name")}</div>
              <Input id="bname" value={b.name} onChange={(e) => set({ name: e.target.value })} className="font-display text-xl" />
              {b.alternatives.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted">Autres pistes :</span>
                  {b.alternatives.map((n) => <button key={n} onClick={() => set({ name: n })} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">{n}</button>)}
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between"><label htmlFor="btag" className="text-sm font-medium">Signature</label>{V("tagline")}</div>
              <Input id="btag" value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Une phrase courte, sans promesse invérifiable" />
              {(ident?.taglines.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted">Autres signatures :</span>
                  {ident!.taglines.map((t) => <button key={t} onClick={() => set({ tagline: t })} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">{t}</button>)}
                </div>
              )}
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
              <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">Palette</p>{V("palette")}</div>
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
            <div className="flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Logo</h3>{V("logo")}</div>
            <p className="mt-1 text-xs text-muted">{b.logo.concept}</p>
            {!ident?.provided && (ident?.proposals.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Trois propositions</p>
                <div className="grid gap-2">
                  {ident!.proposals.map((pr) => {
                    const on = ident!.current === pr.key;
                    return (
                      <div key={pr.id} className={cx("rounded-2xl border p-2", on ? "border-signal ring-2 ring-signal/30" : "border-line")}>
                        <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-white p-3"><img src={pr.url} alt={`Proposition ${pr.label}`} className="h-full w-full object-contain" /></div>
                        <div className="mt-2 flex items-start justify-between gap-2 px-1">
                          <p className="min-w-0 text-xs"><span className="font-semibold">{pr.label}</span> <span className="text-muted">· {pr.concept}</span></p>
                          <Button size="sm" variant={on ? "secondary" : "primary"} disabled={on || !!choosing || validated.has("logo")} loading={choosing === pr.key} onClick={() => chooseLogo({ choice: pr.key })}>{on ? "Choisi" : "Choisir"}</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Sparkles className="size-4" />} loading={choosing === "regenerate"} disabled={validated.has("logo")} onClick={() => chooseLogo({ regenerate: true })}>Recréer les propositions</Button>
                {validated.has("logo") && <p className="mt-1 text-[11px] text-muted">Logo validé : déverrouillez-le pour en changer.</p>}
              </div>
            )}
            <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wider text-muted">Déclinaisons</p>
            <div className="grid grid-cols-2 gap-2">
              {byRole("logo") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("logo")!.url} alt="Logo principal" className="max-h-20 object-contain" /></div>}
              {byRole("logo-light") && <div className="grid place-items-center rounded-2xl bg-[#141210] p-4"><img src={byRole("logo-light")!.url} alt="Logo clair" className="max-h-20 object-contain" /></div>}
              {byRole("logo-mark") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("logo-mark")!.url} alt="Monogramme" className="max-h-20 object-contain" /></div>}
              {byRole("favicon") && <div className="grid place-items-center rounded-2xl border border-line bg-white p-4"><img src={byRole("favicon")!.url} alt="Favicon" className="size-12 object-contain" /></div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["logo-svg", "logo", "logo-horizontal-svg", "logo-light-svg", "logo-mark-svg", "favicon"].map((r) => byRole(r) && (
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
          <BrandBook />
        </div>
      </div>
      {data.strategy && (
        <Card className="p-5 sm:p-7">
          <SectionTitle title="Stratégie">Angles et messages réutilisés pour les publications et les campagnes.</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">Messages clés</p><ul className="mt-2 grid gap-1.5 text-sm">{data.strategy.keyMessages.map((m) => <li key={m} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{m}</li>)}</ul></div>
            <div><p className="text-xs font-medium uppercase tracking-wider text-muted">Angles</p><ul className="mt-2 grid gap-2 text-sm">{data.strategy.angles.map((a) => <li key={a.title}><strong>{a.title}</strong> : <span className="text-ink-2">{a.idea}</span></li>)}</ul></div>
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

/** Charte de marque mise en page : planches, PDF, régénération. */
function BrandBook() {
  const { id } = useProject();
  const toast = useToast();
  const { data, reload } = useApi<{ book: { pdf: string; pages: string[]; createdAt: number } | null }>(`/api/projects/${id}/brand/book`);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const book = data?.book;
  const refresh = async () => {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/brand/book`, { body: {} });
      toast("ok", "Charte mise à jour avec vos derniers choix.");
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
        <h3 className="font-display text-lg font-semibold">Charte de marque</h3>
        {book && <span className="text-xs text-muted">{book.pages.length} planches</span>}
      </div>
      <p className="mt-1 text-xs text-muted">Logo et usages, couleurs (HEX, RVB, CMJN, contrastes), typographies, ton, applications.</p>
      {book ? (
        <>
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-line bg-paper-2">
            <img src={book.pages[i]} alt={`Planche ${i + 1}`} className="aspect-[1.414] w-full object-contain" />
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
              <button onClick={() => setI((i + book.pages.length - 1) % book.pages.length)} className="grid size-8 place-items-center rounded-full bg-card/90 text-sm shadow-soft" aria-label="Planche précédente">‹</button>
              <span className="rounded-full bg-card/90 px-2.5 py-1 text-xs">{i + 1} / {book.pages.length}</span>
              <button onClick={() => setI((i + 1) % book.pages.length)} className="grid size-8 place-items-center rounded-full bg-card/90 text-sm shadow-soft" aria-label="Planche suivante">›</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={book.pdf} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper"><Download className="size-4" /> PDF</a>
            <Button size="sm" variant="secondary" loading={busy} onClick={refresh}>Mettre à jour</Button>
          </div>
        </>
      ) : (
        <Button size="sm" className="mt-3" loading={busy} onClick={refresh}>Créer la charte</Button>
      )}
    </Card>
  );
}
