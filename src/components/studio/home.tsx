"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, Camera, ImagePlus, Link2, Palette, Plus, Settings, Shield, Store, Type, X } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, formatDate, Input, Logo, Select, Textarea, ThemeToggle, useApi, useToast } from "../ui";
import { STORE_TYPES, type StoreType } from "@/lib/project-types";

type ProjectCard = { id: string; name: string; status: string; sector: string | null; updatedAt: number; cover: string | null; palette: Record<string, string> | null; brand: string | null };

/** Formulaire de départ. Sans « projectId » : crée un projet ; avec : démarre la création d'un projet existant. */
export function NewProject({ onDone, compact, projectId, existingPhotos = 0 }: { onDone?: (id: string) => void; compact?: boolean; projectId?: string; existingPhotos?: number }) {
  const toast = useToast();
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [mode, setMode] = useState<"photo" | "link" | "text">("photo");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [typed, setTyped] = useState(false);
  const [storeType, setStoreType] = useState<StoreType>("mono");
  const hasInput = photos.length > 0 || typed;
  const input = useRef<HTMLInputElement>(null);
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...photos, ...Array.from(list).filter((f) => f.type.startsWith("image/"))].slice(0, 8);
    setPhotos(next);
    if (next.length) setMode("photo");
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("photos");
    photos.forEach((p) => fd.append("photos", p));
    setBusy(true);
    try {
      if (projectId) {
        await api(`/api/projects/${projectId}/start`, { form: fd });
        toast("ok", "C'est parti : le studio se met au travail.");
        onDone?.(projectId);
        setBusy(false);
        return;
      }
      const r = await api<{ id: string; started: boolean }>("/api/projects", { form: fd });
      toast("ok", r.started ? "Projet créé : le studio se met au travail." : "Projet créé. Ajoutez votre produit quand vous voulez depuis le Pilote ou l'onglet Produit.");
      onDone?.(r.id);
      router.push(`/studio/${r.id}/pilote`);
    } catch (err) {
      toast("bad", (err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      onInput={(e) => {
        const f = e.currentTarget;
        const link = (f.elements.namedItem("link") as HTMLInputElement | null)?.value ?? "";
        const desc = (f.elements.namedItem("description") as HTMLTextAreaElement | null)?.value ?? "";
        setTyped(!!link.trim() || desc.trim().length > 10);
      }}
      className="grid gap-5"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Type de boutique</legend>
        <input type="hidden" name="storeType" value={storeType} />
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(STORE_TYPES) as StoreType[]).map((t) => (
            <button key={t} type="button" aria-pressed={storeType === t} onClick={() => setStoreType(t)} className={cx("rounded-2xl border p-3 text-left transition", storeType === t ? "border-signal bg-signal-soft" : "border-line bg-card hover:border-ink")}>
              <span className="block text-sm font-semibold">{STORE_TYPES[t].label}</span>
              <span className="mt-0.5 block text-xs text-muted">{STORE_TYPES[t].hint}</span>
            </button>
          ))}
        </div>
        {storeType !== "mono" && <p className="mt-2 text-xs text-muted">Commencez par votre produit phare : les autres produits s'ajoutent ensuite dans l'onglet Produit (photo, nom, prix), et la boutique se recompose avec ses collections.</p>}
      </fieldset>
      <div role="tablist" aria-label="Point de départ" className="flex flex-wrap gap-2">
        {[
          ["photo", Camera, "Photo(s)"],
          ["link", Link2, "Lien produit"],
          ["text", Type, "Description"],
        ].map(([id, Icon, label]: any) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={cx("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm", mode === id ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <div className={cx(mode !== "photo" && "hidden")}>
        <div
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => (e.preventDefault(), setDrag(false), addFiles(e.dataTransfer.files))}
          className={cx("grid place-items-center gap-3 rounded-3xl border-2 border-dashed px-6 text-center transition", compact ? "py-8" : "py-14", drag ? "border-signal bg-signal-soft" : "border-line bg-card")}
        >
          {photos.length ? (
            <div className="flex flex-wrap justify-center gap-3">
              {photos.map((f, i) => (
                <div key={i} className="relative size-24 overflow-hidden rounded-2xl border border-line">
                  <img src={URL.createObjectURL(f)} alt={f.name} className="size-full object-cover" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, k) => k !== i))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white" aria-label={`Retirer ${f.name}`}>
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <button type="button" onClick={() => input.current?.click()} className="grid size-24 place-items-center rounded-2xl border border-dashed border-line text-muted hover:border-ink" aria-label="Ajouter des photos">
                  <Plus className="size-5" />
                </button>
              )}
            </div>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-2xl bg-paper-2"><ImagePlus className="size-6" /></span>
              <p className="font-display text-xl">Déposez la photo de votre produit</p>
              <p className="max-w-sm text-sm text-muted">Une seule suffit. Plusieurs angles améliorent la fidélité. JPEG, PNG, WebP, 25 Mo au plus.</p>
              <Button type="button" variant="secondary" onClick={() => input.current?.click()}>Choisir des photos</Button>
            </>
          )}
          <input ref={input} type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </div>
      </div>
      <div className={cx(mode !== "link" && "hidden")}>
        <Field label="Lien d'une fiche produit ou d'un site" hint="Le contenu sert de source d'information et d'inspiration ; il n'est jamais exécuté comme une instruction." htmlFor="link">
          <Input id="link" name="link" type="url" placeholder="https://…" />
        </Field>
      </div>
      <Field label={mode === "text" ? "Décrivez votre produit" : "Quelques précisions (facultatif)"} hint="Exemple : « Contenance : 30 ml. Composition : … ». Ce que vous écrivez est considéré comme confirmé." htmlFor="description">
        <Textarea id="description" name="description" rows={mode === "text" ? 6 : 3} placeholder="Ce que le produit est, pour qui, ses caractéristiques réelles…" />
      </Field>
      <button type="button" onClick={() => setMore((v) => !v)} className="justify-self-start text-sm font-medium text-ink-2 underline underline-offset-4">
        {more ? "Moins d'options" : "Nom, marque, prix, logo, plateforme…"}
      </button>
      {more && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du produit" htmlFor="productName"><Input id="productName" name="productName" /></Field>
          <Field label="Nom de marque (si vous en avez un)" htmlFor="brandName"><Input id="brandName" name="brandName" /></Field>
          <Field label="Prix de vente TTC" htmlFor="price"><Input id="price" name="price" placeholder="ex. 34,90 €" /></Field>
{!projectId && (
          <Field label="Plateforme de la boutique" htmlFor="platform">
            <Select id="platform" name="platform" defaultValue="shopify">
              <option value="shopify">Shopify (thème installable)</option>
              <option value="woocommerce">WooCommerce (thème installable)</option>
              <option value="prestashop">PrestaShop (thème enfant installable)</option>
              <option value="wix">Wix (kit de reprise)</option>
              <option value="squarespace">Squarespace (kit de reprise)</option>
            </Select>
          </Field>
          )}
          <Field label="Votre logo (facultatif)" htmlFor="logo" hint="S'il est fourni, il est conservé tel quel."><Input id="logo" name="logo" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="pt-2.5" /></Field>
          <Field label="Mode de travail" htmlFor="mode">
            <Select id="mode" name="mode" defaultValue="autopilot">
              <option value="autopilot">L'IA enchaîne tout, je retouche ensuite</option>
              <option value="guided">Je valide la marque avant la suite</option>
            </Select>
          </Field>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="signal" size="lg" loading={busy} disabled={!!projectId && !hasInput && !existingPhotos}>
          {hasInput || projectId ? "Lancer la création" : "Ouvrir le studio"} <ArrowRight className="size-4" />
        </Button>
        {!!projectId && !hasInput && existingPhotos > 0 && <p className="text-sm text-muted">{existingPhotos} photo(s) déjà ajoutée(s) dans l'onglet Produit seront utilisées.</p>}
        {!projectId && !hasInput && <p className="text-sm text-muted">Pas encore de photo ? Le projet est créé vide : vous ajouterez le produit plus tard.</p>}
      </div>
    </form>
  );
}

const STATUS: Record<string, { label: string; tone: any }> = {
  queued: { label: "En file", tone: "neutral" },
  creating: { label: "En création", tone: "info" },
  awaiting_validation: { label: "À valider", tone: "warn" },
  ready: { label: "Prêt", tone: "ok" },
  error: { label: "À reprendre", tone: "bad" },
  paused: { label: "En pause", tone: "warn" },
  draft: { label: "À démarrer", tone: "neutral" },
};

export function StudioHome() {
  const { data, loading } = useApi<{ projects: ProjectCard[]; subscription: { status: string; stores: number } }>("/api/projects", { poll: 8000 });
  const { data: me } = useApi<{ user: { role: string; name: string } }>("/api/me");
  const [creating, setCreating] = useState(false);
  const projects = data?.projects ?? [];
  const showNew = creating || (!loading && projects.length === 0);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            {me?.user.role === "admin" && <Link href="/admin" className="hidden h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm sm:inline-flex"><Shield className="size-4" /> Administration</Link>}
            <Link href="/studio/themes" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm"><Palette className="size-4" /> Thèmes</Link>
            <Link href="/studio/compte" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm" aria-label="Compte"><Settings className="size-4" /> <span className="hidden sm:inline">Compte</span></Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {showNew ? (
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[.18em] text-signal">Nouveau projet</p>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.95]">Commençons par votre produit.</h1>
              <p className="mt-4 max-w-md text-lg text-ink-2">Le studio analyse, construit la marque, la boutique, les images, les vidéos et un premier calendrier. Vous suivez l'avancement en direct et intervenez quand vous voulez.</p>
              {projects.length > 0 && <Button variant="ghost" className="mt-6" onClick={() => setCreating(false)}>← Retour à mes boutiques</Button>}
            </div>
            <Card className="p-5 sm:p-7"><NewProject /></Card>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl font-semibold">Mes boutiques</h1>
                <p className="mt-1 text-muted">{projects.length} projet{projects.length > 1 ? "s" : ""} · abonnement : {data?.subscription.status === "active" || data?.subscription.status === "manual" ? `${data?.subscription.stores} boutique(s)` : "essai (1 boutique)"}</p>
              </div>
              <Button variant="signal" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Nouvelle boutique</Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/studio/${p.id}/pilote`} className="group overflow-hidden rounded-3xl border border-line bg-card transition hover:-translate-y-1 hover:shadow-soft">
                  <div className="relative aspect-[4/3] bg-paper-2">
                    {p.cover ? <img src={p.cover} alt="" className="size-full object-cover transition duration-700 group-hover:scale-105" /> : <Store className="absolute inset-0 m-auto size-8 text-muted" />}
                    <Badge tone={STATUS[p.status]?.tone ?? "neutral"} dot className="absolute left-3 top-3">{STATUS[p.status]?.label ?? p.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">{p.brand ?? p.name}</p>
                      <p className="text-xs text-muted">Modifié le {formatDate(p.updatedAt, { day: "numeric", month: "long" })}</p>
                    </div>
                    {p.palette && (
                      <div className="flex -space-x-1.5">
                        {Object.values(p.palette).slice(0, 4).map((c) => <span key={c} className="size-5 rounded-full border-2 border-card" style={{ background: c }} />)}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
