import {storeProducts,type ThemeSpec} from './spec';
import {routeFor} from './render';
/** Le renderer natif choisit les vrais modèles ; un modèle orphelin n'est pas une page livrée. */
export function themeTargetPaths(spec:ThemeSpec,template:string){
  if(template.startsWith('group:'))return ['/'];
  const candidates=['/','/collections','/collections/all','/cart','/search','/blogs/news','/blogs/news/article','/password','/404',...storeProducts(spec).map(p=>`/products/${p.handle}`),...spec.store.pages.map(p=>`/pages/${p.handle}`),...(spec.store.collections??[]).map(c=>`/collections/${c.handle}`),...(spec.store.biens??[]).map(b=>`/pages/bien/${b.handle}`)];
  return [...new Set(candidates.filter(path=>routeFor(spec,path,new URLSearchParams()).template===template))];
}
