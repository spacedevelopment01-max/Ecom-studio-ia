"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Plus, RefreshCw, Save, Store, Trash2 } from "lucide-react";
import { api, Badge, Button, Card, Field, Input, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, SectionTitle, type AssetView } from "./common";
import { cleanServices, ContactModePicker, missingActivity, ServicesEditor } from "./services-editor";
import { emptyServiceProfile, type Fact, type ServiceProfile } from "@/lib/project-types";
import { useT } from "../i18n";

const SOURCE: Record<string, { fr: string; en: string }> = { user: { fr: "vous", en: "you" }, photo: { fr: "photo", en: "photo" }, link: { fr: "site actuel", en: "current website" }, ai: { fr: "analyse", en: "analysis" }, description: { fr: "votre description", en: "your description" } };

/** Onglet « Activité » d'un projet de services : l'activité, les prestations, la zone, les horaires et les contacts. */
export default function TabActivite() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const t = useT();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [offer, setOffer] = useState<ServiceProfile>(emptyServiceProfile());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!data || dirty) return;
    setName(data.product.name);
    setCategory(data.product.category);
    setSummary(data.product.summary);
    setFacts(data.product.facts);
    setOffer({ ...emptyServiceProfile(), ...data.services });
  }, [data, dirty]);
  if (!data) return null;
  const p = data.product;
  const change = <K extends keyof ServiceProfile>(k: K, v: ServiceProfile[K]) => (setOffer({ ...offer, [k]: v }), setDirty(true));
  const editFact = (i: number, patch: Partial<Fact>) => (setFacts(facts.map((f, k) => (k === i ? { ...f, ...patch, source: "user" } : f))), setDirty(true));
  const missing = missingActivity(data.services);
  const MISSING: Record<string, string> = {
    services: t("Vos prestations", "Your services"),
    area: t("Zone d'intervention ou adresse", "Service area or address"),
    contact: t("Téléphone ou e-mail", "Phone or email"),
    hours: t("Horaires", "Opening hours"),
    booking: t("Lien de prise de rendez-vous", "Booking link"),
  };
  async function save() {
    setBusy("save");
    try {
      await api(`/api/projects/${id}`, { method: "PATCH", body: { activity: { name, category, summary, facts: facts.filter((f) => f.label.trim()) }, services: { ...offer, services: cleanServices(offer.services) } } });
      toast("ok", t("Activité enregistrée : elle sera utilisée par toutes les prochaines créations.", "Business details saved: they will be used for everything created from now on."));
      setDirty(false);
      await reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function rebuild() {
    setBusy("rebuild");
    try {
      if (dirty) await save();
      await api(`/api/projects/${id}/theme/build`, { body: {} });
      toast("ok", t("Le site se recompose avec ces informations : une nouvelle version sera créée (la précédente reste restaurable).", "The website is being rebuilt with these details: a new version will be created (the previous one can be restored)."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <EngineNotice what={t("l'analyse de l'activité et l'extraction des informations", "the business analysis and information extraction")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <Card className="min-w-0 p-5 sm:p-7">
            <SectionTitle title={t("Votre activité", "Your business")} action={<Badge tone={p.analyzedBy === "ai" ? "info" : "neutral"}>{p.analyzedBy === "ai" ? t("Analyse IA", "AI analysis") : t("Moteur local", "Local engine")}</Badge>}>
              {t("Ce que vous écrivez ici est considéré comme confirmé et repris tel quel sur le site, dans les images et les publications. Rien n'est inventé : ce qui manque reste « à compléter ».", "What you write here is treated as confirmed and used as is on the website, in images and in posts. Nothing is made up: anything missing stays marked “to complete”.")}
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Activité ou service phare", "Business or flagship service")} htmlFor="act-name"><Input id="act-name" value={name} maxLength={160} onChange={(e) => (setName(e.target.value), setDirty(true))} placeholder={t("Ex. Plombier chauffagiste à Lyon", "E.g. Plumber and heating engineer in Leeds")} /></Field>
              <Field label={t("Métier", "Trade")} htmlFor="act-cat"><Input id="act-cat" value={category} maxLength={120} onChange={(e) => (setCategory(e.target.value), setDirty(true))} placeholder={t("Ex. Plomberie et chauffage", "E.g. Plumbing and heating")} /></Field>
            </div>
            <div className="mt-4">
              <Field label={t("Présentation en une ou deux phrases", "One- or two-sentence introduction")} htmlFor="act-sum"><Textarea id="act-sum" rows={3} value={summary} maxLength={2000} onChange={(e) => (setSummary(e.target.value), setDirty(true))} /></Field>
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium">{t("Informations confirmées", "Confirmed information")}</p>
              <p className="mt-0.5 text-xs text-muted">{t("Ex. devis gratuit, disponibilité, années d'expérience, qualifications réelles.", "E.g. free quotes, availability, years of experience, actual qualifications.")}</p>
              <ul className="mt-2 grid">
                {facts.map((f, i) => (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 border-t border-line py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_132px_40px] sm:items-start">
                    <Input value={f.label} onChange={(e) => editFact(i, { label: e.target.value })} className="h-10 text-sm font-medium" aria-label={t("Information", "Information")} placeholder={t("Information", "Information")} />
                    <button type="button" onClick={() => (setFacts(facts.filter((_, k) => k !== i)), setDirty(true))} className="grid size-10 place-items-center rounded-full hover:bg-paper-2 sm:order-last" aria-label={t("Supprimer", "Delete")}><Trash2 className="size-4 text-muted" /></button>
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <Input value={f.value} onChange={(e) => editFact(i, { value: e.target.value, status: e.target.value ? "confirmed" : "unknown" })} placeholder={t("À compléter", "To complete")} className="h-10 text-sm" aria-label={t("Valeur", "Value")} />
                      <span className="mt-1 block text-[11px] text-muted">{t("source :", "source:")} {SOURCE[f.source] ? t(SOURCE[f.source].fr, SOURCE[f.source].en) : f.source}</span>
                    </div>
                    <Select value={f.status} onChange={(e) => editFact(i, { status: e.target.value as Fact["status"] })} className="col-span-2 h-10 text-sm sm:col-span-1" aria-label={t("Statut", "Status")}>
                      <option value="confirmed">{t("Confirmé", "Confirmed")}</option>
                      <option value="inferred">{t("Observé", "Observed")}</option>
                      <option value="unknown">{t("Inconnu", "Unknown")}</option>
                    </Select>
                  </li>
                ))}
                {!facts.length && <li className="border-t border-line py-3 text-sm text-muted">{t("Aucune pour l'instant.", "None yet.")}</li>}
              </ul>
              <Button variant="secondary" size="sm" className="mt-2" icon={<Plus className="size-4" />} onClick={() => (setFacts([...facts, { key: `custom_${Date.now()}`, label: "", value: "", status: "confirmed", source: "user" }]), setDirty(true))}>{t("Ajouter une information", "Add information")}</Button>
            </div>
          </Card>

          <Card className="min-w-0 p-5 sm:p-7">
            <SectionTitle title={t("Prestations", "Services")}>{t("Le prix et la durée ne s'affichent que si vous les indiquez.", "Price and duration are only shown if you enter them.")}</SectionTitle>
            <ServicesEditor value={offer.services} onChange={(v) => change("services", v)} idPrefix="act-svc" />
          </Card>

          <Card className="min-w-0 p-5 sm:p-7">
            <SectionTitle title={t("Zone, horaires et contact", "Area, hours and contact")}>{t("Repris dans l'en-tête, le pied de page, la page Contact et les boutons d'action du site.", "Used in the header, footer, Contact page and the site's call-to-action buttons.")}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Zone d'intervention", "Service area")} htmlFor="act-area"><Input id="act-area" value={offer.area} maxLength={300} onChange={(e) => change("area", e.target.value)} placeholder={t("Ex. Lyon et 30 km autour", "E.g. Leeds and 20 miles around")} /></Field>
              <Field label={t("Adresse (si vous recevez du public)", "Address (if customers visit you)")} htmlFor="act-address"><Input id="act-address" value={offer.address} maxLength={300} autoComplete="street-address" onChange={(e) => change("address", e.target.value)} /></Field>
              <Field label={t("Téléphone", "Phone")} htmlFor="act-phone"><Input id="act-phone" type="tel" value={offer.phone} maxLength={40} autoComplete="tel" onChange={(e) => change("phone", e.target.value)} /></Field>
              <Field label={t("E-mail", "Email")} htmlFor="act-email"><Input id="act-email" type="email" value={offer.email} maxLength={160} autoComplete="email" onChange={(e) => change("email", e.target.value)} /></Field>
              <div className="sm:col-span-2">
                <Field label={t("Horaires", "Opening hours")} htmlFor="act-hours"><Input id="act-hours" value={offer.hours} maxLength={400} onChange={(e) => change("hours", e.target.value)} placeholder={t("Ex. Lun–Ven 8 h–19 h, samedi sur rendez-vous", "E.g. Mon–Fri 8am–7pm, Saturday by appointment")} /></Field>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <p className="text-sm font-medium">{t("Comment vos clients vous contactent", "How customers get in touch")}</p>
              <ContactModePicker value={offer.contactMode} onChange={(v) => change("contactMode", v)} />
              {(offer.contactMode === "booking" || offer.bookingUrl) && (
                <Field label={t("Lien de prise de rendez-vous", "Booking link")} htmlFor="act-booking" hint={t("Calendly, Planity, Doctolib… Le bouton « Prendre rendez-vous » du site y mène.", "Calendly, Fresha, Acuity… The site's “Book an appointment” button leads there.")}>
                  <Input id="act-booking" type="url" value={offer.bookingUrl} maxLength={500} onChange={(e) => change("bookingUrl", e.target.value)} placeholder="https://…" />
                </Field>
              )}
            </div>
          </Card>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-card/95 p-3 shadow-soft backdrop-blur">
            <Button onClick={save} loading={busy === "save"} disabled={!dirty || !!busy} icon={<Save className="size-4" />}>{t("Enregistrer", "Save")}</Button>
            <Button variant="secondary" onClick={rebuild} loading={busy === "rebuild"} disabled={!!busy || !data.brand} icon={<Store className="size-4" />}>{dirty ? t("Enregistrer et mettre à jour le site", "Save and update the website") : t("Mettre à jour le site", "Update the website")}</Button>
            <p className="min-w-0 flex-1 text-xs text-muted">{dirty ? t("Modifications non enregistrées.", "Unsaved changes.") : !data.brand ? t("Le site pourra être mis à jour une fois la marque créée.", "The website can be updated once the brand exists.") : t("Tout est enregistré.", "Everything is saved.")}</p>
          </div>
        </div>

        <div className="grid min-w-0 content-start gap-6">
          <Card className="p-5">
            {missing.length ? (
              <>
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><AlertCircle className="size-5 text-warn" aria-hidden /> {t("À compléter", "To complete")}</h3>
                <p className="mt-1 text-xs text-muted">{t("Le studio ne devine jamais ces informations. Tant qu'elles manquent, le site affiche un espace « à compléter » à la place.", "The studio never guesses this information. Until it's provided, the website shows a “to complete” placeholder instead.")}</p>
                <ul className="mt-3 grid gap-1.5 text-sm">
                  {missing.map((m) => <li key={m} className="flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-warn">{MISSING[m]}</li>)}
                </ul>
              </>
            ) : (
              <p className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden /> {t("Les informations essentielles du site sont renseignées.", "The website's essential details are filled in.")}</p>
            )}
          </Card>
          <ActivityPhotos />
          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold">{t("Nouvelle analyse", "New analysis")}</h3>
            <p className="mt-1 text-xs text-muted">{t("Relit votre description et votre site actuel, puis relance marque, textes, images et site. Vos saisies sont conservées ; les versions précédentes restent disponibles.", "Rereads your description and current website, then reruns brand, copy, images and website. Your entries are kept; previous versions remain available.")}</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              icon={<RefreshCw className="size-4" />}
              onClick={async () => {
                if (!confirm(t("Réanalyser l'activité relance aussi les étapes suivantes (marque, textes, images, site…). Continuer ?", "Reanalyzing the business also reruns the following steps (brand, copy, images, website…). Continue?"))) return;
                await api(`/api/projects/${id}/resume`, { body: { from: "analysis" } });
                toast("ok", t("Nouvelle analyse lancée.", "New analysis started."));
                reload();
              }}
            >
              {t("Réanalyser tout le projet", "Reanalyze the whole project")}
            </Button>
            <Link href={`/studio/${id}/pilote`} className="mt-2 block text-xs text-muted underline underline-offset-4">{t("Suivre l'avancement dans le Pilote", "Follow progress in the Pilot")}</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Photos de l'activité (réalisations, équipe, lieu) : utilisées telles quelles, la première ouvre le site. */
function ActivityPhotos() {
  const { id } = useProject();
  const toast = useToast();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const { data, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=lifestyle`);
  const list = data?.assets ?? [];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{t("Photos de l'activité", "Business photos")}</h3>
        <Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => input.current?.click()}>{t("Ajouter", "Add")}</Button>
      </div>
      <p className="mt-1 text-xs text-muted">{t("Réalisations, équipe, lieu. Utilisées telles quelles (jamais détourées) ; la première ouvre le site, les autres rejoignent la galerie.", "Your work, team, premises. Used as they are (never cut out); the first one opens the website, the others join the gallery.")}</p>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={async (e) => {
          const fd = new FormData();
          Array.from(e.target.files ?? []).forEach((f) => fd.append("files", f));
          e.target.value = "";
          fd.append("role", "lifestyle");
          try {
            await api(`/api/projects/${id}/files`, { form: fd });
            toast("ok", t("Photos ajoutées : mettez à jour le site pour les voir.", "Photos added: update the website to see them."));
            reload();
          } catch (err) {
            toast("bad", (err as Error).message);
          }
        }}
      />
      {list.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {list.map((a, i) => (
            <figure key={a.id} className="overflow-hidden rounded-xl border border-line">
              <AssetThumb a={a} className="aspect-square w-full" />
              <figcaption className="truncate px-1.5 py-1 text-[10px] text-muted">{i === 0 ? t("Ouverture", "Hero") : t("Galerie", "Gallery")}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-paper-2 p-3 text-xs text-muted">{t("Aucune photo pour l'instant : vos vraies photos rendent le site bien plus crédible.", "No photos yet: real photos make the website far more credible.")}</p>
      )}
    </Card>
  );
}
