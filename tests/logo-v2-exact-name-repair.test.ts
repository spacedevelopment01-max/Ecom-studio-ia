/** Comparaison des pixels du vrai réparateur local, sans OCR ni fournisseur simulé positif. */
import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {createUser} from '@/lib/auth';
import {loadProject} from '@/lib/projects';
import {brandDiscovery} from '@/lib/logo-v2/discovery';
import {acceptedDirections,directionBrief} from '@/lib/logo-v2/accepted-directions';
import {correctArtworkText} from '@/lib/logo-v2/artwork';
import {artFixture,seedLogoFixture} from './logo-v2-fixtures';
import {draftsFor} from './logo-v2-mock';
import {directionIdentity} from './preparation-mission-fixtures';
const user=await createUser(`exact-case-${Date.now()}@example.test`,'test-password-exact-case','Test');
const base={...brandDiscovery(loadProject(seedLogoFixture(user.id,'saas'))),name:'Éclat  d’atelier'};
const directions=acceptedDirections(draftsFor(base).slice(0,3).map((t,i)=>({...t,identity:directionIdentity(i),typography:{...t.typography,rationale:'Hiérarchie propre à la direction'},colorRole:{...t.colorRole,rationale:'Rôles cohérents'},style:(['typographic','monogram','gradient']as const)[i],symbolIdea:t.symbolIdea??null,descriptor:null,imageBrief:'Un dessin de marque précis, avec un nom lisible dans une composition soignée.',colors:[directionIdentity(i).palette.primary],distinctive:'Une construction propre à cette direction'})),base);
const image=await artFixture(1),box={x:.25,y:.68,w:.5,h:.1},hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
for(const casing of ['upper','lower']as const)it(`la réparation SYNA conserve les pixels du nom exact malgré une direction ${casing}`,async()=>{
 const t={...directions[0],markType:'symbol_wordmark'as const,typography:{...directions[0].typography,case:casing}},scoped=directionBrief(base,t,directions,true),reference=await correctArtworkText(image,box,{...t,typography:{...t.typography,case:'title'}},scoped),repaired=await correctArtworkText(image,box,t,scoped);
 expect(reference).not.toBeNull();expect(repaired).not.toBeNull();expect(hash(repaired!)).toBe(hash(reference!));expect(hash(repaired!)).not.toBe(hash(image));
});
it('conserve le choix de casse du parcours historique hors du mode SYNA accepté',async()=>{
 const t={...directions[0],markType:'symbol_wordmark'as const},legacy=directionBrief(base,t,directions),upper=await correctArtworkText(image,box,{...t,typography:{...t.typography,case:'upper'}},legacy),lower=await correctArtworkText(image,box,{...t,typography:{...t.typography,case:'lower'}},legacy),title=await correctArtworkText(image,box,{...t,typography:{...t.typography,case:'title'}},legacy);
 expect(upper).not.toBeNull();expect(lower).not.toBeNull();expect(title).not.toBeNull();expect(hash(upper!)).not.toBe(hash(title!));expect(hash(lower!)).not.toBe(hash(title!));
});
