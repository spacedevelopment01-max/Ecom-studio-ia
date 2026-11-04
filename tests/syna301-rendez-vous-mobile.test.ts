import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
// Recette lot 8 (390 px) : le tableau des réservations (640 px minimum) élargissait toute la page Rendez-vous.
it('la colonne de Rendez-vous reste à la largeur de l’écran ; seul le tableau défile',()=>{
 const s=readFileSync('src/components/studio/tab-rendez-vous.tsx','utf8');
 expect(s).toContain('<div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5" data-rdv={data.kind}>');
 expect(s).toMatch(/overflow-x-auto">\s*<table className="w-full min-w-\[640px\]/);
});
