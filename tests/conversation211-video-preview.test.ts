/** Le devis permet de relire les différences réellement appliquées, sans déclencher de rendu. */
import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ConversationVideoPreview} from '@/components/studio/conversation-video-preview';
import {videoQuoteSummary} from '@/lib/video-v2/quote-summary';
import {conversationMotionDocument,conversationVideoEdit} from '@/lib/video-v2/conversation-motion';
import {account,project,emptySpend} from './conversation209-fixtures';
import {validatedBrand} from './preparation-mission-fixtures';
import {loadProject} from '@/lib/projects';
import {saveAsset} from '@/lib/library';
import sharp from 'sharp';
it('montre caméra, transition, musique traduite, gains et textes entiers avant/après sans écriture ou appel',async()=>{
 const u=await account(),pid=project(u);validatedBrand(pid);
 const a=await saveAsset({projectId:pid,userId:u.id,data:await sharp({create:{width:90,height:160,channels:3,background:'#224466'}}).png().toBuffer(),name:'Source fictive',mime:'image/png',origin:'upload'});
 const original=conversationMotionDocument(loadProject(pid),{tool:'videos.motion',target:{kind:'project'},aspect:'9:16',purpose:'organic',scenes:[{image:{kind:'asset',assetId:a.id,version:a.version},durationS:6,camera:'push_in',title:'Texte avant',titleColor:'#FFFFFF',place:'lower'}],line:'',cta:'',music:'none',sourceId:'turn.1',quote:'Ma demande'},[a.id]);
 const next=conversationVideoEdit(original,[{op:'text',clipId:original.clips[0].id,layerId:'ov-text',text:'Texte après\nDeux  espaces.'},{op:'music',mood:'warm'},{op:'audio_gain',track:'music',gainDb:-18},{op:'transition',clipId:original.clips[0].id,kind:'fade',durationS:.4}]);
 const snapshot=JSON.stringify({original,next}),spent=emptySpend(),href=(id:string)=>`/api/assets/${id}`;
 const before=videoQuoteSummary(original,href),after=videoQuoteSummary(next,href);
 const html=renderToStaticMarkup(createElement(ConversationVideoPreview,{before,after}));
 for(const text of ['Avant : montage conservé','Après : montage proposé','zoom avant local','fondu','0.4 s','chaleureuse','-18 dB','Texte avant','Texte après\nDeux  espaces.','ne simule pas la vidéo finale','Aucune piste de voix'])expect(html).toContain(text);
 expect(html).not.toContain('warm');expect(html).not.toContain('pulse');expect(after.scenes[0].text[0]).toBe('Texte après\nDeux  espaces.');
 expect(before.scenes[0].transition).toEqual({kind:'cut',durationS:0});expect(after.scenes[0].transition).toEqual({kind:'fade',durationS:.4});
 expect(JSON.stringify({original,next})).toBe(snapshot);expect(emptySpend()).toEqual(spent);
});
