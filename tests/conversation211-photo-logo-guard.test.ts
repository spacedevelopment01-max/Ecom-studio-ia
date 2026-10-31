/** Une identité ne passe pas dans la retouche PHOTO qui interdit le texte ; aucun appel fournisseur. */
import {it,expect,vi,beforeEach,afterEach}from 'vitest';
import sharp from 'sharp';
import {account,project}from './conversation209-fixtures';
import {openProjectConversation}from '@/lib/orchestrator/conversation';
import {ownedConversation}from '@/lib/orchestrator/conversation/store';
import {selectedImageSource}from '@/lib/orchestrator/conversation/image-tool-sources';
import {saveAsset}from '@/lib/library';
beforeEach(()=>{vi.stubEnv('STUDIO_CONVERSATION_LOT_A','1');vi.stubEnv('STUDIO_CONVERSATION_AI','1');});afterEach(()=>vi.unstubAllEnvs());
async function source(role:string,meta:Record<string,unknown>={}){const u=await account(),pid=project(u),c=openProjectConversation(u,pid),a=await saveAsset({userId:u.id,projectId:pid,data:await sharp({create:{width:64,height:64,channels:3,background:'#2a5a48'}}).png().toBuffer(),mime:'image/png',name:'reference-identifiee.png',role,origin:'upload',status:'review',meta});return{row:ownedConversation(u,c.id),a,selection:{kind:'asset'as const,assetId:a.id,version:a.version},text:'Retouche reference-identifiee.png, sans changer les lettres.'};}
it.each(['logo','logo-v2','logo-v2-original','logo-ai-full','brand-board','direction-preview'])('refuse une source de marque native %s avant tout devis de retouche photo',async role=>{const f=await source(role);expect(()=>selectedImageSource(f.row,f.selection,f.text,'source')).toThrow('logo');});
it('refuse aussi la provenance LogoV2 si son rôle a été mal classé',async()=>{const f=await source('image',{engine:'logo-v2'});expect(()=>selectedImageSource(f.row,f.selection,f.text,'source')).toThrow('logo');});
it('le nom du fichier ou du métier ne suffit pas à bloquer une vraie photo',async()=>{const f=await source('original');expect(selectedImageSource(f.row,f.selection,f.text+' pour un atelier de logos','source').pin.assetId).toBe(f.a.id);});
it('un logo explicitement désigné comme style ne devient pas une source à modifier',async()=>{const f=await source('logo');expect(selectedImageSource(f.row,f.selection,f.text,'style').pin.assetId).toBe(f.a.id);});
