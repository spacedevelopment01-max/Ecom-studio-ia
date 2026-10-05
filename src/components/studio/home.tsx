"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Briefcase, Camera, Film, Globe, ImagePlus, Link2, Palette, Plus, Settings, Shield, Sparkles, Store, Type, X } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, formatDate, Input, Logo, Select, Textarea, ThemeToggle, useApi, useToast } from "../ui";
import { STORE_TYPES, storeTypeInfo, type BusinessType, type ServiceItem, type ServiceProfile, type StoreType } from "@/lib/project-types";
import { LANGS } from "@/lib/i18n";
import { LangSwitch, useLang, useT } from "../i18n";
import { useCostConfirm } from "./cost-confirm";
import { QuotaBanner, useBilling } from "../billing-client";
import { PLANS } from "@/lib/plans";
import { isPlatform, platformInfo, PlatformCards, recommendedPlatform, type PlatformId } from "./platform-picker";
import { cleanServices, ContactModePicker, ServicesEditor } from "./services-editor";

type ProjectCard = { id: string; name: string; status: string; sector: string | null; platform: string; business: BusinessType; updatedAt: number; cover: string | null; palette: Record<string, string> | null; brand: string | null };

/** Formulaire de départ. Sans « projectId » : crée un projet ; avec : démarre la création d'un projet existant. */
export function NewProject({ onDone, compact, projectId, existingPhotos = 0, initialBusiness = "products", initialPlatform }: { onDone?: (id: string) => void; compact?: boolean; projectId?: string; existingPhotos?: number; initialBusiness?: BusinessType; initialPlatform?: string }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessType>(initialBusiness);
  // « J'ai déjà mon site et mon logo » : le studio lit le site ; plateforme et type d'activité sont détectés.
  const [existing, setExisting] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [owner, setOwner] = useState(false);
  const [siteErr, setSiteErr] = useState<{ url?: string; owner?: string }>({});
  const [platform, setPlatform] = useState<PlatformId>(isPlatform(initialPlatform) ? initialPlatform : recommendedPlatform(initialBusiness));
  const [platformTouched, setPlatformTouched] = useState(isPlatform(initialPlatform));
  const [photos, setPhotos] = useState<File[]>([]);
  const [mode, setMode] = useState<"photo" | "link" | "text">("photo");
  const [more, setMore] = useState(false);
  // Vidéos de la création complète : choix annoncé dès le départ. Les plans filmés par l'IA utilisent
  // 2 vidéos IA du forfait (la création initiale de la boutique ne décompte pas les visuels).
  const [videos, setVideos] = useState<"ai" | "edited" | "none">("ai");
  const { billing } = useBilling();
  const AI_VIDEOS_NEEDED = 2;
  const videoAiBlocked: string | null = !billing
    ? null
    : !billing.plan
      ? t("Inclus dans les forfaits : choisissez un forfait pour en profiter.", "Included in the plans: choose a plan to use it.")
      : billing.quotas.aiVideos.left < AI_VIDEOS_NEEDED
        ? t(`Il vous reste ${billing.quotas.aiVideos.left} vidéo${billing.quotas.aiVideos.left > 1 ? "s" : ""} IA ce mois-ci (il en faut ${AI_VIDEOS_NEEDED}).`, `You have ${billing.quotas.aiVideos.left} AI video${billing.quotas.aiVideos.left === 1 ? "" : "s"} left this month (${AI_VIDEOS_NEEDED} needed).`)
        : null;
  useEffect(() => {
    if (videoAiBlocked && videos === "ai") setVideos("edited");
  }, [videoAiBlocked, videos]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [typed, setTyped] = useState(false);
  const [storeType, setStoreType] = useState<StoreType>("mono");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [contactMode, setContactMode] = useState<ServiceProfile["contactMode"]>("form");
  const [needDesc, setNeedDesc] = useState(false);
  const svc = business === "services";
  const hasInput = (!svc && photos.length > 0) || typed;
  const input = useRef<HTMLInputElement>(null);
  const cost = useCostConfirm();
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...photos, ...Array.from(list).filter((f) => f.type.startsWith("image/"))].slice(0, 8);
    setPhotos(next);
    if (next.length) setMode("photo");
  };
  function chooseBusiness(b: BusinessType | "site") {
    setExisting(b === "site");
    setSiteErr({});
    if (b === "site") return;
    setBusiness(b);
    setNeedDesc(false);
    if (!platformTouched) setPlatform(recommendedPlatform(b));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (existing) {
      const err: { url?: string; owner?: string } = {};
      if (!/^(https?:\/\/)?[^\s/]+\.[^\s]+$/i.test(siteUrl.trim())) err.url = t("Indiquez l'adresse de votre site, par exemple www.mon-site.fr.", "Enter your website address, for example www.my-site.com.");
      if (!owner) err.owner = t("Cochez cette case pour continuer.", "Tick this box to continue.");
      setSiteErr(err);
      if (err.url || err.owner) {
        (e.currentTarget.elements.namedItem(err.url ? "siteUrl" : "siteOwnership") as HTMLInputElement | null)?.focus();
        return;
      }
    } else if (svc && !typed) {
      // Site de services : la description de l'activité (ou le site actuel) est indispensable.
      setNeedDesc(true);
      (e.currentTarget.elements.namedItem("description") as HTMLTextAreaElement | null)?.focus();
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.delete("photos");
    if (!existing) photos.forEach((p) => fd.append("photos", p));
    if (svc && !existing) fd.set("services", JSON.stringify(cleanServices(services)));
    if ((hasInput || existing) && !(await cost.confirm("pipeline", { videos }))) return;
    setBusy(true);
    try {
      if (projectId) {
        await api(`/api/projects/${projectId}/start`, { form: fd });
        toast("ok", t("C'est parti : le studio se met au travail.", "Here we go: the studio is getting to work."));
        onDone?.(projectId);
        setBusy(false);
        return;
      }
      const r = await api<{ id: string; started: boolean }>("/api/projects", { form: fd });
      toast("ok", r.started ? t("Projet créé : le studio se met au travail.", "Project created: the studio is getting to work.") : t("Projet créé. Ajoutez votre produit quand vous voulez depuis le Pilote ou l'onglet Produit.", "Project created. Add your product whenever you like from the Pilot or the Product tab."));
      onDone?.(r.id);
      router.push(`/studio/${r.id}/pilote`);
    } catch (err) {
      toast("bad", (err as Error).message);
      setBusy(false);
    }
  }
  const photoZone = (
    <div
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => (e.preventDefault(), setDrag(false), addFiles(e.dataTransfer.files))}
      className={cx("grid place-items-center gap-3 rounded-3xl border-2 border-dashed px-6 text-center transition", compact || svc ? "py-8" : "py-14", drag ? "border-signal bg-signal-soft" : "border-line bg-card")}
    >
      {photos.length ? (
        <div className="flex flex-wrap justify-center gap-3">
          {photos.map((f, i) => (
            <div key={i} className="relative size-24 overflow-hidden rounded-2xl border border-line">
              <img src={URL.createObjectURL(f)} alt={f.name} className="size-full object-cover" />
              <button type="button" onClick={() => setPhotos(photos.filter((_, k) => k !== i))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white" aria-label={t(`Retirer ${f.name}`, `Remove ${f.name}`)}>
                <X className="size-3" />
              </button>
            </div>
          ))}
          {photos.length < 8 && (
            <button type="button" onClick={() => input.current?.click()} className="grid size-24 place-items-center rounded-2xl border border-dashed border-line text-muted hover:border-ink" aria-label={t("Ajouter des photos", "Add photos")}>
              <Plus className="size-5" />
            </button>
          )}
        </div>
      ) : svc ? (
        <>
          <span className="grid size-12 place-items-center rounded-2xl bg-paper-2"><ImagePlus className="size-5" /></span>
          <p className="font-display text-lg">{t("Photos de votre activité (facultatif)", "Photos of your business (optional)")}</p>
          <p className="max-w-sm text-sm text-muted">{t("Réalisations, équipe, lieu. Elles sont utilisées telles quelles, sans détourage. 8 photos au plus.", "Your work, your team, your premises. They are used as they are, never cut out. Up to 8 photos.")}</p>
          <Button type="button" variant="secondary" onClick={() => input.current?.click()}>{t("Choisir des photos", "Choose photos")}</Button>
        </>
      ) : (
        <>
          <span className="grid size-14 place-items-center rounded-2xl bg-paper-2"><ImagePlus className="size-6" /></span>
          <p className="font-display text-xl">{t("Déposez la photo de votre produit", "Drop your product photo")}</p>
          <p className="max-w-sm text-sm text-muted">{t("Une seule suffit. Plusieurs angles améliorent la fidélité. JPEG, PNG, WebP, 25 Mo au plus.", "One is enough. Several angles improve accuracy. JPEG, PNG, WebP, 25 MB max.")}</p>
          <Button type="button" variant="secondary" onClick={() => input.current?.click()}>{t("Choisir des photos", "Choose photos")}</Button>
        </>
      )}
      <input ref={input} type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
    </div>
  );
  return (
    <form
      onSubmit={submit}
      onInput={(e) => {
        const f = e.currentTarget;
        const link = (f.elements.namedItem("link") as HTMLInputElement | null)?.value ?? "";
        const desc = (f.elements.namedItem("description") as HTMLTextAreaElement | null)?.value ?? "";
        const ok = !!link.trim() || desc.trim().length > 10;
        setTyped(ok);
        if (ok) setNeedDesc(false);
      }}
      className="grid gap-6"
      noValidate
    >
      {cost.dialog}
      <input type="hidden" name="businessType" value={business} />
      {existing && <input type="hidden" name="existingSite" value="1" />}
      <fieldset>
        <legend className="mb-2.5 font-display text-xl font-semibold">{t("Que voulez-vous créer ?", "What do you want to create?")}</legend>
        <div role="radiogroup" aria-label={t("Que voulez-vous créer ?", "What do you want to create?")} className="grid gap-2.5 sm:grid-cols-2">
          {([
            ["products", Store, t("Une boutique", "An online store"), t("Je vends des produits.", "I sell products.")],
            ["services", Briefcase, t("Le site de mon entreprise de services", "My services business website"), t("Artisan, coach, salon, cabinet, agence, restaurant, photographe, professeur…", "Tradesperson, coach, salon, practice, agency, restaurant, photographer, tutor…")],
            ["site", Globe, t("J'ai déjà mon site et mon logo", "I already have my website and logo"), t("Le studio récupère votre site, votre logo et vos produits, et vous utilisez tout le reste : images, vidéos, publications, publicités, calendrier.", "The studio retrieves your website, your logo and your products, and you use everything else: images, videos, posts, ads, calendar.")],
          ] as const).map(([id, Icon, label, hint]) => {
            const on = id === "site" ? existing : !existing && business === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => chooseBusiness(id)} className={cx("flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal", id === "site" && "sm:col-span-2", on ? "border-signal bg-signal-soft" : "border-line bg-card hover:border-ink")}>
                <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", on ? "bg-signal text-signal-ink" : "bg-paper-2")}><Icon className="size-5" aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-tight">{label}</span>
                  <span className="mt-1 block text-xs text-muted">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {existing ? (
        <ExistingSiteFields url={siteUrl} onUrl={(v) => (setSiteUrl(v), siteErr.url && setSiteErr({ ...siteErr, url: undefined }))} owner={owner} onOwner={(v) => (setOwner(v), v && setSiteErr({ ...siteErr, owner: undefined }))} errors={siteErr} showLanguage={!projectId} />
      ) : (
      <>
      {!svc && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("Type de boutique", "Store type")}</legend>
          <input type="hidden" name="storeType" value={storeType} />
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(STORE_TYPES) as StoreType[]).map((st) => (
              <button key={st} type="button" aria-pressed={storeType === st} onClick={() => setStoreType(st)} className={cx("rounded-2xl border p-3 text-left transition", storeType === st ? "border-signal bg-signal-soft" : "border-line bg-card hover:border-ink")}>
                <span className="block text-sm font-semibold">{storeTypeInfo(st, lang).label}</span>
                <span className="mt-0.5 block text-xs text-muted">{storeTypeInfo(st, lang).hint}</span>
              </button>
            ))}
          </div>
          {storeType !== "mono" && <p className="mt-2 text-xs text-muted">{t("Commencez par votre produit phare : les autres produits s'ajoutent ensuite dans l'onglet Produit (photo, nom, prix), et la boutique se recompose avec ses collections.", "Start with your hero product: other products are added afterwards in the Product tab (photo, name, price), and the store reorganizes itself into collections.")}</p>}
        </fieldset>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-1">
          <span className="block font-display text-xl font-semibold">{svc ? t("Où sera publié votre site ?", "Where will your website live?") : t("Sur quelle plateforme vendrez-vous ?", "Which platform will you sell on?")}</span>
          <span className="mt-0.5 block text-xs text-muted">{svc ? t("Conseil : WordPress pour un site de services ; Shopify convient aussi. Modifiable à tout moment dans le studio.", "Tip: WordPress for a services website; Shopify works too. You can change it anytime in the studio.") : t("Modifiable à tout moment dans le studio.", "You can change it anytime in the studio.")}</span>
        </legend>
        <PlatformCards name="platform" value={platform} onChange={(p) => (setPlatform(p), setPlatformTouched(true))} business={business} compact={compact} />
      </fieldset>
      {!projectId && (
        <Field label={svc ? t("Langue du site et des contenus", "Website and content language") : t("Langue de la boutique et des contenus", "Store and content language")} htmlFor="language" hint={t("Vous pourrez choisir une autre langue pour une action précise (par exemple des publicités en anglais).", "You can pick another language for a specific action later (for example, ads in French).")}>
          <Select id="language" name="language" defaultValue={lang} key={lang}>
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        </Field>
      )}
      {svc ? (
        <div className="grid gap-5">
          <Field
            label={t("Décrivez votre activité", "Describe your business")}
            htmlFor="description"
            error={needDesc ? t("Indispensable : quelques lignes sur votre activité, ou le lien de votre site actuel ci-dessous.", "Required: a few lines about your business, or the link to your current website below.") : null}
            hint={t("Votre métier, vos prestations, votre zone, ce qui vous distingue. Ce que vous écrivez est considéré comme confirmé ; rien n'est inventé.", "Your trade, your services, your area, what sets you apart. Whatever you write is treated as confirmed; nothing is made up.")}
          >
            <Textarea id="description" name="description" rows={5} aria-required="true" aria-invalid={needDesc || undefined} placeholder={t("Ex. : Plombier chauffagiste à Lyon, dépannage 7j/7, installation de chaudières, devis gratuit.", "E.g.: Plumber and heating engineer in Leeds, emergency call-outs 7 days a week, boiler installation, free quotes.")} />
          </Field>
          <Field label={t("Votre site actuel (si vous en avez un)", "Your current website (if you have one)")} htmlFor="link" hint={t("Le studio y lit votre présentation, vos prestations et vos coordonnées, comme source d'information uniquement.", "The studio reads your introduction, services and contact details there, as a source of information only.")}>
            <Input id="link" name="link" type="url" placeholder="https://…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Nom de l'entreprise", "Business name")} htmlFor="brandName"><Input id="brandName" name="brandName" maxLength={80} autoComplete="organization" placeholder={t("Vide : le studio vous en propose", "Empty: the studio suggests some")} /></Field>
            <Field label={t("Zone d'intervention", "Service area")} htmlFor="area"><Input id="area" name="area" placeholder={t("Ex. Lyon et 30 km autour", "E.g. Leeds and 20 miles around")} maxLength={300} /></Field>
            <Field label={t("Adresse (si vous recevez du public)", "Address (if customers visit you)")} htmlFor="address"><Input id="address" name="address" maxLength={300} autoComplete="street-address" /></Field>
            <Field label={t("Horaires", "Opening hours")} htmlFor="hours"><Input id="hours" name="hours" placeholder={t("Ex. Lun–Ven 8 h–19 h", "E.g. Mon–Fri 8am–7pm")} maxLength={400} /></Field>
            <Field label={t("Téléphone", "Phone")} htmlFor="phone"><Input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" /></Field>
            <Field label={t("E-mail", "Email")} htmlFor="email"><Input id="email" name="email" type="email" maxLength={160} autoComplete="email" /></Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("Vos prestations", "Your services")} <span className="font-normal text-muted">{t("(facultatif : sinon le studio les reprend de votre description)", "(optional: otherwise the studio takes them from your description)")}</span></legend>
            <ServicesEditor value={services} onChange={setServices} idPrefix="new-svc" />
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("Comment vos clients vous contactent", "How customers get in touch")}</legend>
            <input type="hidden" name="contactMode" value={contactMode} />
            <ContactModePicker value={contactMode} onChange={setContactMode} />
            {contactMode === "booking" && (
              <Field label={t("Lien de prise de rendez-vous", "Booking link")} htmlFor="bookingUrl" hint={t("Calendly, Planity, Doctolib… Le bouton « Prendre rendez-vous » du site y mènera.", "Calendly, Fresha, Acuity… The site's “Book an appointment” button will lead there.")}>
                <Input id="bookingUrl" name="bookingUrl" type="url" placeholder="https://…" maxLength={500} />
              </Field>
            )}
          </fieldset>
          {photoZone}
          <Field label={t("Votre logo (facultatif)", "Your logo (optional)")} htmlFor="logo" hint={t("S'il est fourni, il est conservé tel quel.", "If provided, it is kept exactly as is.")}><LogoInput /></Field>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label={t("Point de départ", "Starting point")} className="flex flex-wrap gap-2">
            {[
              ["photo", Camera, t("Photo(s)", "Photo(s)")],
              ["link", Link2, t("Lien produit", "Product link")],
              ["text", Type, t("Description", "Description")],
            ].map(([id, Icon, label]: any) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={cx("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm", mode === id ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div className={cx(mode !== "photo" && "hidden")}>{photoZone}</div>
          <div className={cx(mode !== "link" && "hidden")}>
            <Field label={t("Lien d'une fiche produit ou d'un site", "Link to a product page or website")} hint={t("Le contenu sert de source d'information et d'inspiration ; il n'est jamais exécuté comme une instruction.", "The content is used as a source of information and inspiration; it is never executed as an instruction.")} htmlFor="link">
              <Input id="link" name="link" type="url" placeholder="https://…" />
            </Field>
          </div>
          <Field label={mode === "text" ? t("Décrivez votre produit", "Describe your product") : t("Quelques précisions (facultatif)", "A few details (optional)")} hint={t("Exemple : « Contenance : 30 ml. Composition : … ». Ce que vous écrivez est considéré comme confirmé.", "Example: \"Volume: 30 ml. Ingredients: …\". Whatever you write is treated as confirmed.")} htmlFor="description">
            <Textarea id="description" name="description" rows={mode === "text" ? 6 : 3} placeholder={t("Ce que le produit est, pour qui, ses caractéristiques réelles…", "What the product is, who it's for, its actual features…")} />
          </Field>
        </>
      )}
      </>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-1">
          <span className="block font-display text-xl font-semibold">{t("Vidéos de la création", "Videos in the creation")}</span>
          <span className="mt-0.5 block text-xs text-muted">{t("Vous pourrez toujours en créer d'autres plus tard dans l'onglet Vidéos.", "You can always create more later in the Videos tab.")}</span>
        </legend>
        <input type="hidden" name="videos" value={videos} />
        <div role="radiogroup" aria-label={t("Vidéos de la création", "Videos in the creation")} className="grid gap-2">
          {([
            ["ai", Sparkles, t("Avec plans filmés par l'IA", "With AI-filmed shots"), t(`Meilleur rendu : chaque vidéo contient un plan tourné par l'IA à partir de votre produit. Utilise ${AI_VIDEOS_NEEDED} vidéos IA de votre forfait.`, `Best result: each video includes a shot filmed by AI from your product. Uses ${AI_VIDEOS_NEEDED} AI videos from your plan.`), videoAiBlocked],
            ["edited", Film, t("Montées à partir de vos images", "Edited from your images"), t("Animation, textes et musique à partir de vos photos. N'utilise pas vos vidéos IA.", "Animation, captions and music from your photos. Doesn't use your AI videos."), null],
            ["none", X, t("Pas de vidéo pour l'instant", "No video for now"), t("Aucune vidéo : vous les créerez plus tard, quand vous voudrez, dans l'onglet Vidéos.", "No video: you'll create them later, whenever you like, in the Videos tab."), null],
          ] as const).map(([id, Icon, label, hint, blocked]) => {
            const disabled = !!blocked;
            return (
            <button key={id} type="button" role="radio" aria-checked={videos === id} disabled={disabled} onClick={() => setVideos(id)} className={cx("flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50", videos === id ? "border-signal bg-signal-soft" : "border-line bg-card hover:border-ink")}>
              <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl", videos === id ? "bg-signal text-signal-ink" : "bg-paper-2")}><Icon className="size-4" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{label}</span>
                <span className="mt-1 block text-xs text-muted">{hint}</span>
                {blocked && <span className="mt-1.5 block text-xs font-medium text-warn">{blocked}</span>}</span>
            </button>
            );
          })}
        </div>
      </fieldset>
      <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="justify-self-start text-sm font-medium text-ink-2 underline underline-offset-4">
        {more ? t("Moins d'options", "Fewer options") : svc || existing ? t("Mode de travail…", "Workflow…") : t("Nom, marque, prix, logo, mode de travail…", "Name, brand, price, logo, workflow…")}
      </button>
      {more && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!svc && !existing && (
            <>
              <Field label={t("Nom du produit", "Product name")} htmlFor="productName"><Input id="productName" name="productName" /></Field>
              <Field label={t("Nom de marque (si vous en avez un)", "Brand name (if you have one)")} htmlFor="brandName"><Input id="brandName" name="brandName" /></Field>
              <Field label={t("Prix de vente TTC", "Retail price (incl. tax)")} htmlFor="price"><Input id="price" name="price" placeholder={t("ex. 34,90 €", "e.g. €34.90")} /></Field>
              <Field label={t("Votre logo (facultatif)", "Your logo (optional)")} htmlFor="logo" hint={t("S'il est fourni, il est conservé tel quel.", "If provided, it is kept exactly as is.")}><LogoInput /></Field>
            </>
          )}
          <Field label={t("Mode de travail", "Workflow")} htmlFor="mode">
            <Select id="mode" name="mode" defaultValue="autopilot">
              <option value="autopilot">{t("L'IA enchaîne tout, je retouche ensuite", "AI runs everything, I fine-tune afterwards")}</option>
              <option value="guided">{t("Je valide la marque avant la suite", "I approve the brand before moving on")}</option>
            </Select>
          </Field>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="signal" size="lg" loading={busy} disabled={!existing && !svc && !!projectId && !hasInput && !existingPhotos}>
          {existing ? t("Récupérer mon site", "Retrieve my website") : hasInput || projectId || svc ? t("Lancer la création", "Start creating") : t("Ouvrir le studio", "Open the studio")} <ArrowRight className="size-4" />
        </Button>
        {!existing && !svc && !!projectId && !hasInput && existingPhotos > 0 && <p className="text-sm text-muted">{t(`${existingPhotos} photo(s) déjà ajoutée(s) dans l'onglet Produit seront utilisées.`, `${existingPhotos} photo${existingPhotos > 1 ? "s" : ""} already added in the Product tab will be used.`)}</p>}
        {!existing && !svc && !projectId && !hasInput && <p className="text-sm text-muted">{t("Pas encore de photo ? Le projet est créé vide : vous ajouterez le produit plus tard.", "No photo yet? The project is created empty: you can add the product later.")}</p>}
        {!existing && svc && !hasInput && <p className="text-sm text-muted">{t("Quelques lignes sur votre activité suffisent pour démarrer.", "A few lines about your business are enough to get started.")}</p>}
      </div>
    </form>
  );
}

const STATUS: Record<string, { label: string; labelEn: string; tone: any }> = {
  queued: { label: "En file", labelEn: "Queued", tone: "neutral" },
  creating: { label: "En création", labelEn: "Creating", tone: "info" },
  awaiting_validation: { label: "À valider", labelEn: "To review", tone: "warn" },
  ready: { label: "Prêt", labelEn: "Ready", tone: "ok" },
  error: { label: "À reprendre", labelEn: "Needs attention", tone: "bad" },
  paused: { label: "En pause", labelEn: "Paused", tone: "warn" },
  draft: { label: "À démarrer", labelEn: "Not started", tone: "neutral" },
};

/** Champ logo traduit (le bouton natif « Choose File » suit la langue du navigateur, pas celle du studio). */
function LogoInput() {
  const t = useT();
  const [name, setName] = useState("");
  return (
    <label htmlFor="logo" className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-card px-3 text-sm transition hover:border-ink focus-within:outline-2 focus-within:outline-signal">
      <input id="logo" name="logo" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="sr-only" onChange={(e) => setName(e.target.files?.[0]?.name ?? "")} />
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-paper-2 px-2.5 py-1 text-xs font-medium"><ImagePlus className="size-3.5" aria-hidden /> {t("Choisir un fichier", "Choose a file")}</span>
      <span className="min-w-0 truncate text-muted">{name || t("Aucun fichier choisi", "No file chosen")}</span>
    </label>
  );
}

/** Plateformes avec lesquelles le studio travaille : le site du client y est conservé tel quel. */
const KEPT_LABELS = "Shopify, WordPress / WooCommerce, PrestaShop, Wix, Squarespace";

/** Champs de « J'ai déjà mon site et mon logo » : adresse, accord, logo facultatif, langue ; ce qui va se passer. */
function ExistingSiteFields({ url, onUrl, owner, onOwner, errors, showLanguage }: { url: string; onUrl: (v: string) => void; owner: boolean; onOwner: (v: boolean) => void; errors: { url?: string; owner?: string }; showLanguage: boolean }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className="grid gap-5">
      <Field label={t("Adresse de votre site", "Your website address")} htmlFor="siteUrl" error={errors.url ?? null} hint={t("La page d'accueil suffit : le studio lit aussi les pages du menu.", "The home page is enough: the studio also reads the pages in your menu.")}>
        <Input id="siteUrl" name="siteUrl" className="scroll-mt-28" inputMode="url" autoComplete="url" required aria-required="true" aria-invalid={!!errors.url || undefined} placeholder="https://www.mon-site.fr" value={url} onChange={(e) => onUrl(e.target.value)} maxLength={500} />
      </Field>
      <div>
        <label className={cx("flex items-start gap-3 rounded-2xl border p-3.5 text-sm", errors.owner ? "border-bad" : "border-line bg-card")}>
          <input type="checkbox" name="siteOwnership" value="1" checked={owner} onChange={(e) => onOwner(e.target.checked)} required aria-required="true" aria-invalid={!!errors.owner || undefined} aria-describedby={errors.owner ? "siteOwnership-err" : undefined} className="mt-0.5 size-4 shrink-0 accent-[var(--color-signal)]" />
          <span>{t("Je confirme que ce site m'appartient ou que je suis autorisé à l'utiliser.", "I confirm that this website belongs to me or that I am authorized to use it.")}</span>
        </label>
        {errors.owner && <p id="siteOwnership-err" role="alert" className="mt-1.5 text-xs text-bad">{errors.owner}</p>}
      </div>
      <Field label={t("Votre logo (facultatif)", "Your logo (optional)")} htmlFor="logo" hint={t("Sinon, le studio reprend celui de votre site, tel quel.", "Otherwise, the studio takes the one on your website, exactly as it is.")}><LogoInput /></Field>
      {showLanguage && (
        <Field label={t("Langue des contenus", "Content language")} htmlFor="language" hint={t("Langue des images, vidéos, publications et publicités créées par le studio. Les textes de votre site ne sont pas traduits.", "Language of the images, videos, posts and ads made by the studio. Your website's text is not translated.")}>
          <Select id="language" name="language" defaultValue={lang} key={lang}>
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        </Field>
      )}
      <div className="rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">
        <p className="font-medium text-ink">{t("Ce qui va se passer", "What happens next")}</p>
        <ul className="mt-2 grid gap-1.5 text-[13px] leading-relaxed">
          <li>{t("Le studio lit votre site : la plateforme sur laquelle il est fait, votre logo, vos pages, vos produits, vos couleurs et vos polices. Vous n'avez rien à choisir.", "The studio reads your website: the platform it is built on, your logo, your pages, your products, your colors and your fonts. You don't need to choose anything.")}</li>
          <li>{t(`Fait avec ${KEPT_LABELS} : votre site est conservé tel quel. Le studio travaille pour lui sans le modifier.`, `Built with ${KEPT_LABELS}: your website is kept as it is. The studio works for it without changing it.`)}</li>
          <li>{t("Fait avec une autre plateforme, ou sur mesure : il est reproduit à l'identique sur Shopify (boutique) ou WordPress (site de services) — mêmes pages, menu, textes, images, logo et couleurs. Le code de votre ancien thème n'est pas copié.", "Built with another platform, or custom-made: it is reproduced as is on Shopify (store) or WordPress (services website) — same pages, menu, text, images, logo and colors. Your old theme's code is not copied.")}</li>
          <li>{t("Votre marque reste la vôtre : aucun nouveau nom ni nouveau logo. Ce qui manque sur votre site reste à compléter ; rien n'est inventé.", "Your brand stays yours: no new name or logo. Anything missing from your website stays to be completed; nothing is made up.")}</li>
        </ul>
      </div>
    </div>
  );
}

export function StudioHome() {
  const t = useT();
  const { lang } = useLang();
  const { data, loading } = useApi<{ projects: ProjectCard[]; subscription: { status: string; stores: number } }>("/api/projects", { poll: 8000 });
  const { data: me } = useApi<{ user: { role: string; name: string } }>("/api/me");
  const [creating, setCreating] = useState(false);
  const { billing } = useBilling({ poll: 60000 });
  const projects = data?.projects ?? [];
  const showNew = creating || (!loading && projects.length === 0);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="E-COM STUDIO IA"><span className="hidden sm:inline"><Logo /></span><span className="sm:hidden"><Logo compact /></span></Link>
          <div className="flex items-center gap-2">
            {me?.user.role === "admin" && <Link href="/admin" className="hidden h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm sm:inline-flex"><Shield className="size-4" /> {t("Administration", "Admin")}</Link>}
            <Link href="/studio/themes" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm"><Palette className="size-4" /> {t("Thèmes", "Themes")}</Link>
            <Link href="/studio/compte" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm" aria-label={t("Mon compte", "My account")}><Settings className="size-4" /> <span className="hidden sm:inline">{t("Mon compte", "My account")}</span></Link>
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <QuotaBanner billing={billing} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {showNew ? (
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[.18em] text-signal">{t("Nouveau projet", "New project")}</p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-[0.95] sm:text-5xl">{t("Une boutique ou le site de votre activité.", "An online store, or your business website.")}</h1>
              <p className="mt-4 max-w-md text-lg text-ink-2">{t("Vous vendez des produits, ou vous proposez des services (artisan, coach, salon, cabinet, agence, restaurant…) : le studio analyse, construit la marque, le site, les images, les vidéos et un premier calendrier de publications. Vous suivez l'avancement en direct et intervenez quand vous voulez.", "Whether you sell products or offer services (trades, coaching, salon, practice, agency, restaurant…), the studio analyzes, then builds the brand, the website, the images, the videos and a first posting calendar. You follow progress live and step in whenever you want.")}</p>
              {projects.length > 0 && <Button variant="ghost" className="mt-6" onClick={() => setCreating(false)}>{t("← Retour à mes projets", "← Back to my projects")}</Button>}
            </div>
            <Card className="p-5 sm:p-7"><NewProject /></Card>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl font-semibold">{t("Mes projets", "My projects")}</h1>
                <p className="mt-1 text-muted">
                  {t(`${projects.length} projet${projects.length > 1 ? "s" : ""} · `, `${projects.length} project${projects.length > 1 ? "s" : ""} · `)}
                  {billing?.plan ? t(`forfait ${PLANS[billing.plan].name.fr} (1 boutique ou 1 site)`, `${PLANS[billing.plan].name.en} plan (1 store or 1 website)`) : t("découverte gratuite", "free discovery")}
                </p>
              </div>
              <Button variant="signal" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t("Nouveau projet", "New project")}</Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/studio/${p.id}/pilote`} className="group overflow-hidden rounded-3xl border border-line bg-card transition hover:-translate-y-1 hover:shadow-soft">
                  <div className="relative aspect-[4/3] bg-paper-2">
                    {p.cover ? <img src={p.cover} alt="" className="size-full object-cover transition duration-700 group-hover:scale-105" /> : p.business === "services" ? <Briefcase className="absolute inset-0 m-auto size-8 text-muted" /> : <Store className="absolute inset-0 m-auto size-8 text-muted" />}
                    <Badge tone={STATUS[p.status]?.tone ?? "neutral"} dot className="absolute left-3 top-3">{(lang === "en" ? STATUS[p.status]?.labelEn : STATUS[p.status]?.label) ?? p.status}</Badge>
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-medium text-ink backdrop-blur">
                      {p.business === "services" ? <Briefcase className="size-3" aria-hidden /> : <Store className="size-3" aria-hidden />}
                      {p.business === "services" ? t("Services", "Services") : t("Boutique", "Store")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">{p.brand ?? p.name}</p>
                      <p className="text-xs text-muted">{isPlatform(p.platform) ? `${platformInfo(p.platform, p.business, t).short} · ` : ""}{t("Modifié le", "Updated")} {formatDate(p.updatedAt, { day: "numeric", month: "long" })}</p>
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
