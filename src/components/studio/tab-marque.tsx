"use client";
/**
 * Écran « Marque » (lot 2) : la marque du client telle que SINA l'a créée. Un écran pour VOIR, télécharger et demander
 * un changement ; aucune création n'y est lancée ni payée (tout passe par SINA, qui annonce le prix avant).
 */
import { useEffect, useState } from "react";
import { Copy, Download, MessageCircle } from "lucide-react";
import { api, Button, Card, cx, Empty, Textarea, useApi } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { useT } from "../i18n";
import { useAgentPanel } from "./agent-ui-context";
import type { BrandSheet, VueEnVrai } from "@/lib/syna-agent/brand-sheet";
import { EsquissesCards } from "./syna-thread";

const ROLE: Record<string, { fr: string; en: string }> = {
  light: { fr: "Fond", en: "Background" }, dark: { fr: "Texte", en: "Text" }, primary: { fr: "Bouton", en: "Button" },
  secondary: { fr: "Surface", en: "Surface" }, accent: { fr: "Accent", en: "Accent" },
};
/** Le bouton « Copier » d'un code (couleur, nom de police) : le texte part dans le presse-papiers, tel quel. */
export function BoutonCopier({ texte }: { texte: string }) {
  const t = useT();
  const [fait, setFait] = useState(false);
  return <button type="button" className="inline-flex h-auto min-h-7 items-center gap-1 whitespace-normal rounded-full border border-line px-2.5 py-1 text-xs" data-copier={texte}
    onClick={() => { void navigator.clipboard?.writeText(texte).then(() => { setFait(true); setTimeout(() => setFait(false), 1500); }).catch(() => undefined); }}>
    <Copy className="size-3.5" />{fait ? t("Copié", "Copied") : t("Copier", "Copy")}
  </button>;
}

/**
 * La planche en vrai dans l'onglet Marque (25 novembre 2026) : la planche entière, « Tout télécharger », les dix versions
 * du logo en PNG haute définition, chaque couleur avec son code et « Copier », les deux polices (nom à copier, fichier),
 * chaque image en haute définition, téléchargeable seule.
 */
export function PlancheEnVrai({ v }: { v: VueEnVrai }) {
  const t = useT();
  const faces = v.polices.filter((f) => /^[\w .-]+$/.test(f.famille) && /^[\w.-]+$/.test(f.fichier));
  const css = faces.map((f) => `@font-face{font-family:"SINA ${f.famille}";src:url(${f.url}) format("truetype");font-display:swap}`).join("");
  return <section className="space-y-6" data-brand-envrai>
    <style>{css}</style>
    <SectionTitle title={t("Ta planche de marque, en vrai", "Your brand board, full resolution")} action={<a href={v.zip} className="inline-flex h-auto min-h-9 items-center gap-1.5 whitespace-normal rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper" data-brand-zip><Download className="size-4" />{t("Tout télécharger", "Download everything")}</a>} />
    {v.planche && <figure className="overflow-hidden rounded-2xl border border-line bg-card" data-brand-envrai-planche>
      <a href={v.planche.url} target="_blank" rel="noreferrer" className="block cursor-zoom-in"><img src={v.planche.url} width={v.planche.w} height={v.planche.h} alt={t("Ta planche de marque en vrai", "Your full-resolution brand board")} className="block h-auto w-full" loading="lazy" /></a>
      <figcaption className="flex flex-wrap gap-3 border-t border-line px-3 py-2 text-xs"><a href={v.planche.url} target="_blank" rel="noreferrer" className="underline">{t("Ouvrir en grand", "Open full size")}</a><a href={v.planche.download} className="inline-flex items-center gap-1 underline"><Download className="size-3.5" />{t("Télécharger", "Download")}</a></figcaption>
    </figure>}
    {!!v.sansFichier.length && <p className="text-xs text-muted">{t("Sans fichier en haute définition pour l'instant (l'aperçu de ta planche choisie garde leur case) :", "No high-definition file yet (the preview keeps their slot):")} {v.sansFichier.join(", ")}.</p>}
    <div>
      <SectionTitle title={t("Tes logos", "Your logos")}>{t("En PNG haute définition, sur fond transparent.", "High-definition PNG, transparent background.")}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-brand-envrai-logos>
        {v.logos.map((l) => <figure key={l.version} className="overflow-hidden rounded-2xl border border-line">
          <div className="flex h-28 items-center justify-center bg-[repeating-conic-gradient(#f1f1f1_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-3"><img src={l.url} alt={l.label} className="max-h-full max-w-full object-contain" loading="lazy" /></div>
          <figcaption className="flex items-center justify-between gap-2 border-t border-line bg-card px-3 py-2 text-xs"><span>{l.label}</span><a href={l.download} className="underline" aria-label={`${t("Télécharger", "Download")} : ${l.label}`}><Download className="size-3.5" /></a></figcaption>
        </figure>)}
      </div>
    </div>
    {!!v.couleurs.length && <div>
      <SectionTitle title={t("Tes couleurs", "Your colours")}>{t("Mesurées sur ta planche choisie : copie chaque code tel quel.", "Measured on your chosen board: copy each code as is.")}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-brand-envrai-couleurs>
        {v.couleurs.map((c) => <div key={c.hex} className="overflow-hidden rounded-2xl border border-line">
          <div className="h-20" style={{ background: c.hex }} />
          <div className="flex flex-wrap items-center justify-between gap-2 bg-card px-3 py-2 text-xs"><span><b>{c.nom}</b> <span className="font-mono">{c.hex}</span>{!!c.roles?.length && <span className="block text-muted" data-couleur-role>{c.roles.map((r) => t(ROLE[r].fr, ROLE[r].en)).join(" · ")}</span>}</span><BoutonCopier texte={c.hex} /></div>
        </div>)}
      </div>
    </div>}
    {!!v.polices.length && <div>
      <SectionTitle title={t("Tes polices", "Your fonts")} />
      <div className="grid gap-3 sm:grid-cols-2" data-brand-envrai-polices>
        {v.polices.map((f) => <Card key={f.role} className="space-y-2 p-5">
          <p className="text-xs text-muted">{f.role === "titres" ? t("Pour tes titres", "For your headings") : t("Pour tes textes", "For your texts")}</p>
          <p className="text-3xl leading-tight [overflow-wrap:anywhere]" style={{ fontFamily: `"SINA ${f.famille}"` }}>{f.famille}</p>
          {f.remplacee && f.lue && <p className="text-xs text-muted">{t(`La plus proche de « ${f.lue} », qui n'est pas dans le catalogue du Studio.`, `The closest to “${f.lue}”, which is not in the Studio catalogue.`)}</p>}
          <div className="flex flex-wrap items-center gap-3"><BoutonCopier texte={f.famille} /><a href={f.url} download={f.fichier} className="inline-flex items-center gap-1 text-xs underline"><Download className="size-3.5" />{t("Le fichier de la police", "The font file")}</a></div>
        </Card>)}
      </div>
    </div>}
    {!!v.images.length && <div>
      <SectionTitle title={t("Tes images en haute définition", "Your high-definition images")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-brand-envrai-images>
        {v.images.map((x) => <figure key={x.element} className={cx("overflow-hidden rounded-2xl border border-line", x.w && x.h && x.w / x.h >= 2 ? "col-span-2" : "")} data-image-entiere={x.element}>
          <a href={x.url} target="_blank" rel="noreferrer" className={cx("flex items-center justify-center bg-[#ECECEA] p-2", x.w && x.h && x.w / x.h >= 2 ? "aspect-[8/3]" : "aspect-[4/5]")}><img src={x.url} alt={x.label} {...(x.w && x.h ? { width: x.w, height: x.h } : {})} className="block h-auto max-h-full w-auto max-w-full object-contain" loading="lazy" /></a>
          <figcaption className="flex items-center justify-between gap-2 border-t border-line bg-card px-3 py-2 text-xs"><span>{x.label}</span><a href={x.download} className="underline" aria-label={`${t("Télécharger", "Download")} : ${x.label}`}><Download className="size-3.5" /></a></figcaption>
        </figure>)}
      </div>
    </div>}
  </section>;
}

/** Couleur de texte lisible sur une couleur de fond (clair ou foncé). */
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#141414" : "#FFFFFF";
}

export default function TabMarque() {
  const { id } = useProject();
  const t = useT();
  const { setOpen: openSina } = useAgentPanel();
  const { data: s, reload } = useApi<BrandSheet>(`/api/projects/${id}/brand/sheet`);
  const [ask, setAsk] = useState(""), [sending, setSending] = useState(false), [sent, setSent] = useState(""), [error, setError] = useState("");
  // Tant que SINA travaille sur la marque, l'écran se relit seul.
  const moving = s?.stage === "proposed" || s?.stage === "chosen" || s?.stage === "finished";
  useEffect(() => { if (!moving) return; const h = setInterval(() => reload(), 6000); return () => clearInterval(h); }, [moving, reload]);
  if (!s) return null;

  async function send() {
    if (!ask.trim()) return;
    setSending(true); setError("");
    try {
      const view = await api<{ conversationId: string }>("/api/syna/open", { body: { projectId: id } });
      await api(`/api/syna/${view.conversationId}`, { body: { requestId: crypto.randomUUID(), text: ask.trim(), attachmentIds: [] } });
      openSina(true);
      window.dispatchEvent(new CustomEvent("syna:refresh"));
      setSent(ask.trim()); setAsk("");
    } catch (e) { setError((e as Error).message); } finally { setSending(false); }
  }
  const talk = <Button icon={<MessageCircle className="size-4" />} onClick={() => openSina(true)}>{t("Parler à SINA", "Talk to SINA")}</Button>;
  // Les esquisses de logo, tant qu'aucune n'est choisie : le choix part à SINA, comme dans la conversation.
  async function choisir(text: string) {
    setSending(true); setError("");
    try {
      const view = await api<{ conversationId: string }>("/api/syna/open", { body: { projectId: id } });
      await api(`/api/syna/${view.conversationId}`, { body: { requestId: crypto.randomUUID(), text, attachmentIds: [] } });
      openSina(true); window.dispatchEvent(new CustomEvent("syna:refresh")); setSent(text);
    } catch (e) { setError((e as Error).message); } finally { setSending(false); }
  }
  const esquisses = s.esquisses ? <Card className="p-4" data-brand-esquisses><SectionTitle title={t("Les pistes de ton logo", "Your logo directions")} /><EsquissesCards esquisses={s.esquisses} busy={sending} onChoose={choisir} />{sent && <p className="mt-2 text-xs text-muted">{t("Envoyé à SINA :", "Sent to SINA:")} {sent}</p>}{error && <p className="mt-2 text-xs text-red-700">{error}</p>}</Card> : null;
  if (esquisses && (s.stage === "none" || s.stage === "proposed")) return <div className="space-y-6">{esquisses}</div>;
  // Les planches de marque (nouveaux projets) : chacune seule, en entier, sans rien posé dessus ; la case du domaine dessous.
  const planches = s.planches?.length ? <section data-brand-planches>
    <SectionTitle title={s.stage === "proposed" ? t("Tes planches de marque", "Your brand boards") : t("Ta planche de marque", "Your brand board")}>{t("Chaque planche est une présentation de ton identité : ta marque finie et ton site garderont tes vraies informations.", "Each board is a presentation of your identity: your finished brand and your site will keep your real information.")}</SectionTitle>
    <div className="grid gap-4 md:grid-cols-2">
      {s.planches.map((x) => <figure key={x.key} className="overflow-hidden rounded-2xl border border-line bg-card" data-brand-planche={x.key}>
        <a href={x.url} target="_blank" rel="noreferrer" className="block cursor-zoom-in" aria-label={t(`Agrandir la planche ${x.name}`, `Enlarge the ${x.name} board`)}><img src={x.url} width={x.w} height={x.h} alt={t(`Planche de marque ${x.name}`, `${x.name} brand board`)} className="block h-auto w-full" loading="lazy" /></a>
        <figcaption className="space-y-2 border-t border-line px-3 py-2 text-xs">
          <p>{x.caseDuDomaine}</p>
          <div className="flex flex-wrap gap-3"><a href={x.url} target="_blank" rel="noreferrer" className="underline">{t("Ouvrir en grand", "Open full size")}</a><a href={x.download} className="inline-flex items-center gap-1 underline"><Download className="size-3.5" />{t("Télécharger", "Download")}</a></div>
          {s.stage === "proposed" && s.planches.length >= 2 && <Button size="sm" disabled={sending} onClick={() => choisir(t(`Je choisis l'identité ${x.key}.`, `I choose identity ${x.key}.`))}>{t(`Choisir ${x.name}`, `Choose ${x.name}`)}</Button>}
        </figcaption>
      </figure>)}
    </div>
    {sent && <p className="mt-2 text-xs text-muted">{t("Envoyé à SINA :", "Sent to SINA:")} {sent}</p>}{error && <p className="mt-2 text-xs text-red-700">{error}</p>}
  </section> : null;
  if (planches && s.stage === "proposed") return <div className="space-y-6">{planches}</div>;

  if (s.stage === "none") return <Empty title={t("Ta marque se crée avec SINA", "Your brand is created with SINA")} action={talk}>{t("Elle étudie ton marché, cherche l'idée et le nom, puis te montre tes identités en planches de marque. Tu choisis, elle finit ta marque : ton logo, tes couleurs, tes polices, ta charte.", "She studies your market, looks for the idea and the name, then shows you your identities as brand boards. You choose, she finishes your brand: logo, colours, fonts, guidelines.")}</Empty>;
  if (s.stage === "proposed") return <Empty title={t("Tes identités t'attendent", "Your identities are waiting")} action={talk}>{t("SINA t'a montré tes identités en planches de marque. Choisis celle que tu préfères dans la conversation : elle finit ta marque juste après.", "SINA showed you your identities as brand boards. Choose your favourite in the conversation: she finishes your brand right after.")}</Empty>;

  const light = s.colors.find((c) => c.role === "light")?.hex ?? "#FFFFFF", dark = s.colors.find((c) => c.role === "dark")?.hex ?? "#141414";
  const faces = [s.fonts.heading, s.fonts.body].filter((f): f is NonNullable<typeof f> => !!f && /^[\w .-]+$/.test(f.family) && /^[\w.-]+$/.test(f.file));
  const css = faces.map((f) => `@font-face{font-family:"SINA ${f.family}";src:url(/api/syna/fonts/${f.file}) format("truetype");font-weight:${Number(f.weight) || 400};font-display:swap}`).join("");
  const head = s.fonts.heading ? `"SINA ${s.fonts.heading.family}", serif` : "serif", body = s.fonts.body ? `"SINA ${s.fonts.body.family}", sans-serif` : "sans-serif";
  const shots = [s.images.object, s.images.signs, ...s.images.posts].filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="space-y-6" data-brand-sheet={s.stage}>
      <style>{css}</style>
      {/* La marque, sur ses propres couleurs : son logo, sa signature, sa grande scène. */}
      <section className="overflow-hidden rounded-3xl border border-line" style={{ background: light, color: dark }} data-brand-head>
        <div className="grid items-stretch gap-0 md:grid-cols-2">
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-10">
            {s.logo
              ? <span className="inline-flex w-fit max-w-full rounded-2xl bg-white p-4"><img src={s.logo} alt={s.name ?? t("Ton logo", "Your logo")} className="max-h-36 w-auto max-w-full object-contain" data-brand-logo /></span>
              : <p className="text-5xl leading-none [overflow-wrap:anywhere]" style={{ fontFamily: head, fontWeight: s.fonts.heading?.weight ?? 700 }}>{s.name}</p>}
            {s.logo && s.name && <p className="text-2xl leading-tight [overflow-wrap:anywhere]" style={{ fontFamily: head, fontWeight: s.fonts.heading?.weight ?? 700 }}>{s.name}</p>}
            {s.descriptor && <p className="text-xs uppercase tracking-[.14em] opacity-70">{s.descriptor}</p>}
            {s.slogan && <p className="text-xl leading-snug" style={{ fontFamily: head, fontWeight: s.fonts.heading?.weight ?? 700 }} data-brand-slogan>{s.slogan}</p>}
            {s.promise && <p className="max-w-prose text-sm leading-relaxed opacity-85" style={{ fontFamily: body }}>{s.promise}</p>}
            {s.stage === "validated" ? <p className="text-xs font-semibold">✓ {t("Marque validée", "Brand validated")}</p>
              : s.stage === "chosen" ? <p className="text-xs opacity-75">{t("SINA finit ta marque : ton logo, l'objet qui le porte, tes signes, tes premières publications et ta charte arrivent ici.", "SINA is finishing your brand: your logo, the object carrying it, your signs, your first posts and your guidelines will appear here.")}</p>
                : <p className="text-xs opacity-75">{t("Ta marque est prête : regarde-la, puis valide-la avec SINA.", "Your brand is ready: have a look, then validate it with SINA.")}</p>}
          </div>
          {s.images.hero && <div className="min-h-56 md:min-h-0"><img src={s.images.hero.url} alt={t("La scène de ta marque", "Your brand's scene")} className="h-full w-full object-cover" data-brand-hero /></div>}
        </div>
      </section>

      {s.enVrai ? <PlancheEnVrai v={s.enVrai} /> : planches}

      {!!s.issues.length && <Card className="border-amber-400 p-4 text-sm" data-brand-issues><p className="font-semibold">{t("Ce que SINA n'a pas pu réussir", "What SINA could not get right")}</p><ul className="mt-1 list-disc pl-5">{s.issues.map((l, i) => <li key={i}>{l}</li>)}</ul></Card>}

      {!s.enVrai && !!s.colors.length && <section>
        <SectionTitle title={t("Tes couleurs", "Your colours")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-brand-colors>
          {s.colors.map((c) => <div key={c.role} className="overflow-hidden rounded-2xl border border-line">
            <div className="flex h-24 items-end p-3 text-sm font-semibold" style={{ background: c.hex, color: inkOn(c.hex) }}>{t(ROLE[c.role].fr, ROLE[c.role].en)}</div>
            <p className="bg-card px-3 py-2 font-mono text-xs uppercase">{c.hex}</p>
          </div>)}
        </div>
      </section>}

      {!s.enVrai && (s.fonts.heading || s.fonts.body) && <section>
        <SectionTitle title={t("Tes polices", "Your fonts")} />
        <div className="grid gap-3 sm:grid-cols-2" data-brand-fonts>
          {s.fonts.heading && <Card className="p-5"><p className="text-xs text-muted">{t("Pour tes titres", "For your headings")} · {s.fonts.heading.family}</p><p className="mt-2 text-3xl leading-tight [overflow-wrap:anywhere]" style={{ fontFamily: head, fontWeight: s.fonts.heading.weight }}>{s.slogan ?? s.name}</p></Card>}
          {s.fonts.body && <Card className="p-5"><p className="text-xs text-muted">{t("Pour tes textes", "For your texts")} · {s.fonts.body.family}</p><p className="mt-2 text-base leading-relaxed" style={{ fontFamily: body }}>{s.promise ?? s.slogan ?? s.name}</p></Card>}
        </div>
      </section>}

      {(!!s.tone.length || !!s.lines.length) && <section>
        <SectionTitle title={t("Ta voix", "Your voice")} />
        <Card className="space-y-3 p-5 text-sm" data-brand-voice>
          {!!s.tone.length && <p><b>{t("Son ton", "Its tone")} :</b> {s.tone.join(", ")}.</p>}
          {!!s.houseWords.length && <p><b>{t("Ses mots", "Its words")} :</b> {s.houseWords.join(", ")}.</p>}
          {!!s.bannedWords.length && <p><b>{t("Jamais", "Never")} :</b> {s.bannedWords.join(", ")}.</p>}
          {!!s.lines.length && <div className="flex flex-wrap gap-2 pt-1">{s.lines.map((l, i) => <span key={i} className="rounded-full border border-line px-3 py-1.5" style={{ fontFamily: head }}>{l}</span>)}</div>}
        </Card>
      </section>}

      {!!shots.length && <section>
        <SectionTitle title={t("Ta marque en situation", "Your brand in real life")} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3" data-brand-shots>
          {shots.map((x, i) => <a key={i} href={x.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-line"><img src={x.url} alt="" className="h-full w-full object-cover" loading="lazy" /></a>)}
        </div>
      </section>}

      {s.kit && <section>
        <SectionTitle title={t("Ta charte et tes fichiers", "Your guidelines and files")} action={s.kit.book ? <a href={s.kit.book} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper" data-brand-book><Download className="size-4" />{t(`Ta charte (PDF, ${s.kit.pages} pages)`, `Your guidelines (PDF, ${s.kit.pages} pages)`)}</a> : undefined} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-brand-kit>
          {s.kit.items.map((x) => <figure key={x.key} className="overflow-hidden rounded-2xl border border-line">
            <div className="flex h-28 items-center justify-center p-3" style={{ background: x.dark ? dark : "#FFFFFF" }}>{x.downloadHref && x.key !== "svg" && !/\.(png|jpe?g|webp|svg)/i.test(x.href) ? <Download className="size-6 opacity-50" /> : <img src={x.href} alt={x.label} className="max-h-full max-w-full object-contain" loading="lazy" />}</div>
            <figcaption className="flex items-center justify-between gap-2 border-t border-line bg-card px-3 py-2 text-xs"><span>{x.label}</span><a href={x.downloadHref ?? x.href} target="_blank" rel="noreferrer" className="underline" aria-label={`${t("Télécharger", "Download")} : ${x.label}`}><Download className="size-3.5" /></a></figcaption>
          </figure>)}
        </div>
      </section>}

      {!!s.toProve.length && <section>
        <SectionTitle title={t("Ce qui reste à prouver", "What is still to prove")}>{t("SINA ne l'écrira jamais comme acquis sans ton accord.", "SINA will never write it as a fact without your agreement.")}</SectionTitle>
        <Card className="p-5 text-sm"><ul className="list-disc space-y-1 pl-5">{s.toProve.map((l, i) => <li key={i}>{l}</li>)}</ul></Card>
      </section>}

      <section>
        <SectionTitle title={t("Tu veux changer quelque chose ?", "Want to change something?")}>{t("Dis-le à SINA avec tes mots. Si c'est payant, elle t'annonce le prix avant.", "Tell SINA in your own words. If it costs something, she tells you the price first.")}</SectionTitle>
        <Card className="space-y-3 p-5" data-brand-ask>
          <Textarea rows={3} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={t("Par exemple : « Je voudrais un logo plus simple », « Refais la troisième publication avec plus de couleur »…", "For example: \"I'd like a simpler logo\", \"Redo the third post with more colour\"…")} />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={send} loading={sending} disabled={!ask.trim()} icon={<MessageCircle className="size-4" />}>{t("Demander à SINA", "Ask SINA")}</Button>
            {sent && <p className="text-xs text-muted">{t("Envoyé à SINA : elle te répond dans la conversation.", "Sent to SINA: she answers in the conversation.")}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </Card>
      </section>
    </div>
  );
}
