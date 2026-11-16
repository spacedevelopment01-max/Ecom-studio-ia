"use client";
/**
 * Les trois angles de SINA (lot 3) : un sûr, un d'émotion, un audacieux. Un angle vise un type de client. Chaque carte montre ce client (son envie, son besoin), l'accroche, la scène (qui,
 * quand, avant, après), le haut du site en mots, une publication d'exemple, les paroles d'acheteurs qui l'ont inspirée
 * et les informations à confirmer. Le client en choisit UN. Montrées dans le fil de SINA et sur l'écran « Angles ».
 */
import { Button, cx } from "../ui";
import { useT } from "../i18n";

export type Angles = {
  list: { id: string; title: string; audience: string; message: string; emotion: string; why?: string; show?: string; proofsToConfirm: string[]; doubt?: string;
    client?: { name: string; who: string; wants: string; needs: string }; showcase?: string; featured?: string; argument?: string;
    person?: string; moment?: string; before?: string; after?: string; promise?: string; site?: { title: string; text: string; button: string }; post?: { title: string; text: string }; quotes?: { text: string; url: string }[] }[];
  roles?: Record<string, "sur" | "emotion" | "audacieux">; recommendedId: string | null; recommendation?: string; clients?: { why: string; others: string[] } | null; quoteCount?: number; sourceCount: number; chosen: string | null;
};

const ROLE_LABEL = { sur: ["L'angle sûr", "The safe angle"], emotion: ["L'angle d'émotion", "The emotional angle"], audacieux: ["L'angle audacieux", "The bold angle"] } as const;
const ROLE_BAND = { sur: "#43644A", emotion: "#9C3343", audacieux: "#2F3B6B" } as const;
/**
 * Étape des angles : les trois angles (un sûr, un d'émotion, un audacieux). Chaque carte montre l'accroche, la scène
 * (qui, quand, avant, après), le haut du site en mots, une publication d'exemple, les paroles d'acheteurs qui l'ont
 * inspirée et les informations à confirmer. Le client en choisit UN.
 */
export function AngleCards({ angles, busy, onChoose }: { angles: Angles; busy: boolean; onChoose: (title: string) => void }) {
  const t = useT();
  const part = (label: string, value?: string | null) => (value ? <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</dt><dd className="text-ink/90">{value}</dd></div> : null);
  return (
    <div className="@container mt-2 space-y-2" data-syna-angles>
      <p className="text-xs text-muted">{t(`Tes trois angles${angles.quoteCount ? `, écrits à partir de ce que tu m'as dit et de ${angles.quoteCount} paroles réelles d'acheteurs lues sur le web` : ", écrits à partir de ce que tu m'as dit"}. Chacun parle à un type de client différent. Choisis celui que tu veux aller chercher en premier : il guidera ton site, tes publications et tes publicités.`, "Your three angles. Pick the one that feels like you.")}</p>
      {/* Les trois clientèles d'un coup d'œil, côte à côte, avant le détail : à qui on parle, son envie, ce qu'on lui montre en premier. */}
      {angles.list.every((a) => a.client) && <section className="rounded-2xl border border-line bg-card p-3" data-angle-clients>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("Trois clientèles différentes, le même produit", "Three different customers, the same product")}</p>
        <div className="mt-2 grid grid-cols-1 gap-2 @2xl:grid-cols-3">
          {angles.list.map((a) => { const role = angles.roles?.[a.id] ?? "sur", band = ROLE_BAND[role]; return (
            <div key={a.id} className="rounded-xl px-3 py-2 text-xs" style={{ background: `${band}12` }} data-angle-client-summary={a.id}>
              <p className="text-sm font-bold leading-tight" style={{ color: band }}>{a.client!.name}</p>
              <p className="mt-1 text-ink/85"><span className="font-semibold">{t("Son envie", "Wants")} : </span>{a.client!.wants}</p>
              {!!a.featured && <p className="mt-1 text-ink/85"><span className="font-semibold">{t("On lui montre d'abord", "Shown first")} : </span>{a.featured}</p>}
              {!!a.argument && <p className="mt-1 text-ink/85"><span className="font-semibold">{t("L'argument", "The argument")} : </span>{a.argument}</p>}
            </div>); })}
        </div>
        {!!angles.clients?.why && <p className="mt-2 text-[11px] text-muted">{angles.clients.why}</p>}
        {!!angles.clients?.others.length && <p className="mt-1 text-[11px] text-muted">{t("Autres clientèles repérées, pas visées cette fois", "Other customers spotted, not targeted this time")} : {angles.clients.others.join(" · ")}.</p>}
      </section>}
      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-3">
        {angles.list.map((a) => {
          const role = angles.roles?.[a.id] ?? "sur", band = ROLE_BAND[role];
          const mine = angles.chosen === a.id, recommended = angles.recommendedId === a.id;
          return (
            <article key={a.id} className={cx("flex flex-col overflow-hidden rounded-2xl border bg-card text-xs", mine ? "ring-2" : "border-line", !!angles.chosen && !mine && "opacity-60")} style={mine ? { borderColor: band, boxShadow: `0 0 0 2px ${band}` } : undefined} data-angle={a.id}>
              <header className="px-4 pb-4 pt-3 text-white" style={{ background: band }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90" data-angle-role={role}>{t(ROLE_LABEL[role][0], ROLE_LABEL[role][1])}</p>
                  {recommended && <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold" style={{ color: band }} data-angle-recommended>{t("Celui que je te recommande", "My recommendation")}</span>}
                </div>
                {!!a.client && <p className="mt-2 text-lg font-bold leading-tight" data-angle-client>{t("Pour", "For")} : {a.client.name}</p>}
                <h4 className="mt-1 text-sm font-semibold leading-tight opacity-95">{a.title}</h4>
                <p className="mt-3 text-xl font-bold leading-snug" data-angle-hook>« {a.message} »</p>
              </header>
              <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                {recommended && !!angles.recommendation && <p className="rounded-lg px-3 py-2 text-[11px]" style={{ background: `${band}14`, color: band }}>{angles.recommendation}</p>}
                {!!a.client && <dl className="space-y-2 rounded-xl px-3 py-3" style={{ background: `${band}0D` }} data-angle-client-needs>
                  {part(t("Ce client", "This customer"), a.client.who)}
                  {part(t("Son envie", "What they want"), a.client.wants)}
                  {part(t("Son besoin", "What they need"), a.client.needs)}
                  {part(t("Le produit ou la prestation vedette", "The featured product or service"), a.featured)}
                  {part(t("Ce qu'on met en avant pour lui", "What we put forward for them"), a.showcase)}
                </dl>}
                <dl className="space-y-2">
                  {part(t("La scène", "The scene"), a.person ?? a.audience)}
                  {part(t("Quand", "When"), a.moment)}
                  {part(t("Avant", "Before"), a.before)}
                  {part(t("Après", "After"), a.after)}
                  {part(t("La promesse", "The promise"), a.promise)}
                </dl>
                {!!a.site && <section className="rounded-xl border border-line px-3 py-3" data-angle-site>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("Le haut de ton site, en mots", "The top of your site, in words")}</p>
                  <p className="mt-1 text-base font-bold leading-snug text-ink">{a.site.title}</p>
                  <p className="mt-1 text-ink/80">{a.site.text}</p>
                  <span className="mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold text-white" style={{ background: band }}>{a.site.button}</span>
                </section>}
                {!!a.post && <section className="rounded-xl border border-line px-3 py-3" data-angle-post>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("Une publication d'exemple", "A sample post")}</p>
                  <p className="mt-1 font-semibold text-ink">{a.post.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-ink/80">{a.post.text}</p>
                </section>}
                <dl className="space-y-2">
                  {part(t("Ce qu'on montre", "What we show"), a.show)}
                  {part(t("Pourquoi cet angle pour toi", "Why this angle for you"), a.why)}
                </dl>
                {!!a.quotes?.length && <section data-angle-quotes>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("Ce que disent de vrais acheteurs", "What real buyers say")}</p>
                  <ul className="mt-1 space-y-1">{a.quotes.map((q) => <li key={q.text} className="italic text-ink/80">« {q.text} »{!!q.url && <> <a className="not-italic underline text-muted" href={q.url} target="_blank" rel="noreferrer">{t("source", "source")}</a></>}</li>)}</ul>
                </section>}
                {!!a.proofsToConfirm.length && <section className="rounded-lg border border-dashed border-line px-3 py-2" data-angle-confirm>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("À me confirmer avant que je l'écrive", "To confirm before I write it")}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink/90">{a.proofsToConfirm.map((x) => <li key={x}>{x}</li>)}</ul>
                </section>}
                {/* Angle montré avec le doute de SINA (sa relecture ne l'a pas gardé) : dit franchement, jamais caché. */}
                {!!a.doubt && <p className="rounded-md border border-line bg-card px-3 py-2 text-[11px] text-muted" data-angle-doubt={a.id}><strong>{t("Mon doute sur cet angle", "My doubt about this angle")} : </strong>{a.doubt}</p>}
                <div className="mt-auto pt-1">
                  {angles.chosen
                    ? mine && <p className="font-semibold" style={{ color: band }}>✓ {t("Ton angle", "Your angle")}</p>
                    : <Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(a.title)} data-angle-pick={a.id}>{t("Choisir cet angle", "Pick this angle")}</Button>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

