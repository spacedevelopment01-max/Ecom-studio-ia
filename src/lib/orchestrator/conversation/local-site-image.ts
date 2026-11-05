/** Existing project media only. No upload, generation, search provider, or inferred stock photo. */
import {createHash} from 'node:crypto';
import {HttpError} from '../../auth';
import {all} from '../../db';
import {getAsset,assetData,assetUrl,type Asset} from '../../library';
import {themeFileName} from '../../engine/shop';
import {stableHash} from '../../brain/hash';
import type {ConversationRow} from './contract';
export type SiteImagePin={assetId:string;version:number;fingerprint:string;filename:string;name:string};
export type SiteImageView={assetId:string;version:number;name:string;previewHref:string};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’]/g,"'").trim();
const stem=(s:string)=>norm(s).replace(/\.(?:jpe?g|png|webp|avif|gif|svg)$/,'');
function usable(c:ConversationRow,a:Asset|undefined):a is Asset{return !!a&&a.project_id===c.project_id&&a.user_id===c.user_id&&a.kind==='image'&&a.deleted_at===null&&a.status!=='rejected'&&a.role!=='theme-render-capture';}
const fingerprint=(a:Asset)=>stableHash('syna-existing-site-image-1',{...a,bytes:createHash('sha256').update(assetData(a)).digest('hex')});
export const siteImageView=(a:Asset):SiteImageView=>({assetId:a.id,version:a.version,name:a.name,previewHref:assetUrl(a)});
export function chooseSiteImage(c:ConversationRow,name:string):SiteImagePin{
 const candidates=all<Asset>("SELECT * FROM assets WHERE project_id=? AND user_id=? AND kind='image' AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'')!='theme-render-capture'",c.project_id,c.user_id),needle=norm(name).replace(/^(?:(?:la|le)\s+|l')/,''),exact=candidates.filter(a=>a.id===name||norm(a.name)===norm(name)),sameStem=candidates.filter(a=>stem(a.name)===stem(name)),matches=exact.length?exact:sameStem.length?sameStem:candidates.filter(a=>stem(a.name)===stem(needle));
 if(matches.length!==1)throw new HttpError(422,'Image absente ou ambiguë : indiquez le nom exact ou l’identifiant d’une image existante de ce projet. Aucun média inventé ni généré.');
 const a=matches[0];return{assetId:a.id,version:a.version,fingerprint:fingerprint(a),filename:themeFileName(a,a.role??'media'),name:a.name};
}
export function checkedSiteImage(c:ConversationRow,pin:SiteImagePin):Asset{
 const a=getAsset(pin.assetId);if(!usable(c,a)||a.version!==pin.version||fingerprint(a)!==pin.fingerprint)throw new HttpError(409,'L’image source a changé ou n’est plus disponible. Préparez une nouvelle proposition gratuite.');return a;
}
export function currentSiteImage(c:ConversationRow,assetId:string|undefined):SiteImageView|null{const a=assetId?getAsset(assetId):undefined;return usable(c,a)?siteImageView(a):null;}
