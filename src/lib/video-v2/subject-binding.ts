/** Une projection native de l'offre, commune au devis, au scénario et au worker vidéo.
 * Aucun nouveau catalogue, aucune sélection par position, aucune écriture de projet. */
import type {Project} from '../projects';
import type {ThreeScenesRequest} from './three-scenes';
import {resolveSubject,type SubjectOption} from '../creative-subject';
import {projectForSubject} from '../social-v2/ai-post';
import {resolveVideoSubjectBinding,pinImageAsset,imageBindingHash,ImageAssetPinSchema} from '../image-v2/request-binding';
import {assetMeta,getAsset} from '../library';
import {isAutoUsable} from '../quality/usable';
import {HttpError} from '../auth';
import {L} from '../i18n-server';
export function sceneSubjectContext(root:Project,req:ThreeScenesRequest){
 if(!req.binding){const subject=resolveSubject(root,req.subject??null);return{project:projectForSubject(root,subject),subject,bindingDigest:null};}
 if(req.subject)throw new HttpError(409,L('Deux offres concurrentes sont désignées. Choisissez une seule fiche ou prestation native.','Two competing offers were selected. Choose one native listing or service.'));
 const bound=resolveVideoSubjectBinding(root,req.binding,req.generation==='direct'),b=bound.binding;
 if(b.edit||(!b.product&&!b.service))throw new HttpError(409,L('Désignez une fiche produit ou prestation pour cette vidéo ; une retouche photo ne devient pas une demande vidéo.','Select a product listing or service for this video; an image edit does not become a video request.'));
 if((req.sceneImages?.length??0)>(req.scenes??3))throw new HttpError(409,L('Plus de photos que de scènes : précisez le découpage, aucune photo ignorée.','More photos than shots: clarify the sequence; no photo ignored.'));
 if(req.generation==='direct'&&req.sceneImages?.some(Boolean))throw new HttpError(409,L('Une photo de scène ne peut pas être ignorée en mode direct. Choisissez le mode avec référence, ou retirez-la explicitement.','A scene photo cannot be ignored in direct mode. Choose reference mode or explicitly remove it.'));
 // Une photo du même projet n'est pas forcément celle du produit/variante approuvé.
 for(const selected of req.sceneImages??[]){
  if(!selected)continue;
  const parsed=ImageAssetPinSchema.safeParse({assetId:selected.assetId,version:selected.version,sha256:selected.sha256});
  if(!parsed.success||imageBindingHash(pinImageAsset(root.userId,root.id,selected.assetId,parsed.data.version))!==imageBindingHash(parsed.data))throw new HttpError(409,L('La photo de scène doit conserver sa version et ses octets approuvés.','A scene photo must retain its approved version and bytes.'));
  if(b.references.some(r=>imageBindingHash(r)===imageBindingHash(parsed.data)))continue;
  const asset=getAsset(selected.assetId)!,meta=assetMeta<any>(asset),provenance=meta.imageV2?.binding;
  const sameOffer=provenance&&(b.product?imageBindingHash(provenance.product??null)===imageBindingHash(b.product):imageBindingHash(provenance.service??null)===imageBindingHash(b.service));
  if(!sameOffer||asset.origin!=='generated'||!isAutoUsable(asset)||meta.gate?.verdict!=='FINAL'||meta.gate?.checked!==true||meta.hasPerson===true||meta.triage?.hasPerson===true)throw new HttpError(409,L('La photo de scène n’est pas un acquis contrôlé de cette fiche, variante ou prestation. Aucun autre produit ne la remplace.','The scene photo is not a checked acquisition of this listing, variant or service. No other product substitutes for it.'));
 }
 const subject:SubjectOption={kind:b.product?'product':'service',key:b.product?.productId??b.service!.key,name:bound.project.product.name,summary:bound.project.product.summary??'',referenceAssetId:b.references[0]?.assetId??null};
 return{project:bound.project,subject,bindingDigest:bound.digest};
}
