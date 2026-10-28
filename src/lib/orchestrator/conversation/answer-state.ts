/** Une réponse explicitement remise à « inconnu » ne reste pas un fait actif ; l'historique est conservé. */
import type {Brief} from '../../preparation/types';
import type {ConversationState} from './contract';
export function clearConversationAnswer(b:Brief,m:ConversationState,field:string){
  const canonical=['target','goals','business'].includes(field)?b.profile.facts.find(f=>f.key===`conversation.${field}`):undefined;
  if(canonical){canonical.value='';canonical.status='unknown';canonical.source='user';canonical.later=true;}
  if(field==='business'){m.business=null;m.businessSource='unknown';}
  if(field==='target')b.input.target='';
  if(field==='offerName'){b.input.offerName='';b.profile.name='';b.profile.nameStatus='unknown';}
  if(field==='brandName')b.input.brandName='';
  if(field==='goals'&&b.input.business==='services'){b.input.services.contactMode=b.services.contactMode='form';b.input.services.contactModes=b.services.contactModes=[];}
  // Inconnu sur une contrainte supplémentaire n'annule jamais les interdits déjà confirmés.
}
