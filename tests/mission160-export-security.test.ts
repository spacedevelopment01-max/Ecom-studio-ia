import {it,expect} from 'vitest';
import {executableContentScript,staticChecks} from '@/lib/cms-v2/checks';
import {cmsExport} from '@/lib/cms-v2/export';
import {libraryLoader} from '@/lib/theme/loader';
import {clientFixture} from './mission154-fixtures';
import {buildShop} from '@/lib/engine/shop';
import {currentTheme} from '@/lib/projects';
it('données de variantes et JSON-LD valides restent inertes ; scripts exécutables et données mal formées restent refusés',()=>{
 expect(executableContentScript('<script type="application/json" data-variants>[{"id":1,"title":"Bleu"}]</script>')).toBe(false);
 expect(executableContentScript('<script type="application/ld+json">{"@type":"FAQPage"}</script>')).toBe(false);
 for(const input of ['<script>alert(1)</script>','<script src="https://example.test/x.js"></script>','<script type="application/json" onload="alert(1)">[]</script>','<script type="application/json">invalid</script>','<script type="application/json" type="text/javascript">[]</script>','<script type="application/json">[]</script><script>alert(1)</script>','<a href="javascript:alert(1)">x</a>'])expect(executableContentScript(input),input).toBe(true);
});
it('le véritable export PrestaShop du produit client garde ses données de variantes sans faux blocage de sécurité',async()=>{
 const f=await clientFixture({copySource:'ai'});await buildShop(null,f.pid,{direction:'traverse',useAi:false});const spec=currentTheme(f.pid)!.spec;
 const exp=await cmsExport('prestashop',spec,libraryLoader,{projectId:f.pid});const checked=await staticChecks('prestashop',exp,spec,{projectId:f.pid});expect(checked.codes).not.toContain('dangerous_script');expect(checked.measures.security?.score).toBe(10);
});
