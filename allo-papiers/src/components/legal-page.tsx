import type { LegalPage } from "@/content/legal";

export function LegalView({ page }: { page: LegalPage }) {
  return (
    <article className="container-page max-w-3xl py-8">
      <p className="eyebrow">Mis à jour le {page.updated}</p>
      <h1 className="font-display mt-2 text-[2.2rem] font-semibold">{page.title}</h1>
      <p className="mt-4 rounded-2xl border border-[#f3d3a6] bg-warn-soft p-4 text-[0.98rem]">{page.intro}</p>
      <nav aria-label="Sommaire" className="card mt-6 p-5">
        <p className="font-semibold">Sommaire</p>
        <ol className="mt-2 grid list-decimal gap-1 pl-6 text-[0.97rem]">
          {page.blocks.map((b, i) => <li key={i}><a className="hover:text-orange" href={`#s${i}`}>{b.heading}</a></li>)}
        </ol>
      </nav>
      {page.blocks.map((b, i) => (
        <section key={i} id={`s${i}`} className="mt-8">
          <h2 className="text-xl font-semibold">{b.heading}</h2>
          {b.paragraphs?.map((p, j) => <p key={j} className="mt-3 text-ink/90">{p}</p>)}
          {b.list && <ul className="mt-3 grid list-disc gap-1.5 pl-6">{b.list.map((x, j) => <li key={j}>{x}</li>)}</ul>}
        </section>
      ))}
    </article>
  );
}
