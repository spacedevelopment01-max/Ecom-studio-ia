import {describe,it,expect} from 'vitest';
import {previewSelectionScope} from '@/lib/conversation-presentation';
describe('#211 D5 — adresse de la sélection réellement chargée',()=>{
 it('distingue la version de la capacité signée, sans conserver le jeton',()=>{const scope=previewSelectionScope('/preview/projet-test/v/version-test~JETON_FICTIF/pages/offre','projet-test');expect(scope).toEqual({versionId:'version-test',page:'/pages/offre'});expect(JSON.stringify(scope)).not.toContain('JETON_FICTIF');});
 it('lit aussi la page d’accueil et les versions non signées autorisées par le serveur',()=>{expect(previewSelectionScope('/preview/projet-test/v/version-test','projet-test')).toEqual({versionId:'version-test',page:'/'});});
 it('ne reprend pas la référence d’un autre projet ni d’une URL étrangère',()=>{expect(previewSelectionScope('/preview/autre/v/version-test~JETON_FICTIF','projet-test')).toBeNull();expect(previewSelectionScope('https://example.invalid/preview/projet-test/v/version-test','projet-test')).toBeNull();});
 it('refuse un segment mal formé ou une chaîne qui n’est pas un pathname',()=>{for(const path of ['/preview/projet-test/v/~JETON_FICTIF','/preview/projet-test/v/version?secret=fictif','/preview/projet-test/v/version/page#ancre'])expect(previewSelectionScope(path,'projet-test')).toBeNull();});
});
