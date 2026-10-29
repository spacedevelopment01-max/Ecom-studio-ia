/** Positions de propositions natives → IDs/versions/octets réels, jamais index d'un tableau inventé par le modèle. */
import type {z} from 'zod';
import {HttpError} from '../../auth';
import {one,json} from '../../db';
import {getAsset} from '../../library';
import {pinImageAsset,imageBindingHash,ImageBindingSchema,type ImageBinding} from '../../image-v2/request-binding';
import {metaOf} from './store';
import type {ConversationRow} from './contract';
import type {ImageSelectionSchema} from './image-tool-contract';
import {L} from '../../i18n-server';
import {getJob} from '../../jobs';
type Stored={schema:1;id:string;jobId?:string;conversationId:string;input:{binding:ImageBinding};frames:{index:number;outputs:ReturnType<typeof pinImageAsset>[]}[]};
/** Le montage local peut réemployer les pixels d'un logo ; l'outil photo IA garde son interdiction. */
export function selectedImageSource(c:ConversationRow,selection:z.infer<typeof ImageSelectionSchema>,latestText:string,role:'source'|'style'){return selectedSource(c,selection,latestText,role,false,false);}
export function selectedLocalVideoSource(c:ConversationRow,selection:z.infer<typeof ImageSelectionSchema>,latestText:string,secondaryScene=false){return selectedSource(c,selection,latestText,'source',secondaryScene,true);}
export function isNativeIdentityImage(asset:{role:string|null;meta:string}){return asset.role==='logo'||!!asset.role?.startsWith('logo-')||['brand-board','direction-preview','favicon'].includes(asset.role??'')||json<{engine?:string}>(asset.meta,{}).engine==='logo-v2';}
function selectedSource(c:ConversationRow,selection:z.infer<typeof ImageSelectionSchema>,latestText:string,role:'source'|'style',secondaryScene:boolean,preservePixelsOnly:boolean){
 const pid=c.project_id;if(!pid)throw new HttpError(409,'image_project_missing');let pin:ReturnType<typeof pinImageAsset>,binding:ImageBinding|null=null;
 if(selection.kind==='receipt'){
  const row=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND source='local' AND key=?",pid,'agent.images.tool.'+selection.receiptId),saved=json<Stored|null>(row?.value,null);
  if(!saved||saved.schema!==1||saved.id!==selection.receiptId||saved.conversationId!==c.id)throw new HttpError(404,L('Proposition source introuvable dans ce dialogue.','Source proposal not found in this conversation.'));
  const frame=saved.frames.find(f=>f.index===selection.index-1);if(!frame||frame.outputs.length!==1)throw new HttpError(409,L('Cette position ne prouve pas une image acquise unique.','This position does not prove a unique acquired image.'));
  const job=saved.jobId?getJob(saved.jobId):null,step=json<Record<string,{outputs?:unknown}>>(job?.checkpoint,{})[`agent-image-${frame.index}`];
  if(!job||job.user_id!==c.user_id||job.project_id!==pid||job.type!=='image.v2'||!step||imageBindingHash(step.outputs)!==imageBindingHash(frame.outputs))throw new HttpError(409,L('Le reçu ne prouve pas le fichier issu du moteur natif.','The receipt does not prove a file from the native engine.'));
  const expected=frame.outputs[0];pin=pinImageAsset(c.user_id,pid,expected.assetId,expected.version);if(imageBindingHash(pin)!==imageBindingHash(expected))throw new HttpError(409,L('La proposition acquise a changé. Aucun appel.','The acquired proposal changed. No request.'));binding=ImageBindingSchema.parse(saved.input.binding);
 }else{
  pin=pinImageAsset(c.user_id,pid,selection.assetId,selection.version);const a=getAsset(pin.assetId)!,focus=metaOf(c).activeContext?.target,selected=!secondaryScene&&role==='source'&&focus?.kind==='asset'&&focus.assetId===a.id&&focus.version===a.version;
  const named=!!a.name.trim()&&latestText.includes(a.name)&&one<{n:number}>("SELECT COUNT(*) n FROM assets WHERE project_id=? AND name=? AND deleted_at IS NULL",pid,a.name)!.n===1;
  if(!selected&&!named)throw new HttpError(409,L('Désignez cette image ou citez son nom unique avant de la retoucher.','Select this image or name it uniquely before editing it.'));
  const meta=json<{imageV2?:{binding?:unknown};aiPost?:unknown}>(a.meta,{});if(meta.aiPost)throw new HttpError(409,L('Ce visuel de publication doit conserver ses textes et son logo. Sa retouche composée n’est pas encore raccordée à cet outil photo.','This post visual must preserve its text and logo. Composed edits are not connected to this photo tool yet.'));
  const parsed=ImageBindingSchema.safeParse(meta.imageV2?.binding);if(parsed.success)binding=parsed.data;
 }
 const asset=getAsset(pin.assetId)!;
 if(role==='source'&&!preservePixelsOnly&&isNativeIdentityImage(asset))throw new HttpError(409,L('Ce logo ou cette planche de marque ne passe pas dans l’outil photo, qui interdit le texte. Vos fichiers restent conservés ; utilisez Marque pour une nouvelle version avec son devis.','This logo or brand board cannot use the photo tool, which forbids text. Your files are kept; use Brand for a new version with its quote.'));
 const focus=metaOf(c).activeContext?.target;if(!secondaryScene&&role==='source'&&focus?.kind==='asset'&&(focus.assetId!==pin.assetId||focus.version!==pin.version))throw new HttpError(409,L('La source diffère de l’image désignée.','The source differs from the selected image.'));
 return{pin,binding};
}
