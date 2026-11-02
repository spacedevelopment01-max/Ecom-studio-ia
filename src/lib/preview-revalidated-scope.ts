import type {ActiveTarget} from './orchestrator/conversation/active-context-contract';
type Address={template:string;section:string;block?:string};
/** Réconcilie seulement une sélection déjà revalidée, sans résolution ni autorisation métier. */
export function canAdoptRevalidatedPreviewScope(input:{
 projectId:string;versionId:string;page:string;selection:Address|null;
 scope:{versionId:string;page:string}|null;
 focus:{projectId:string;tab:string;target:ActiveTarget}|null;
}):boolean{
 const {projectId,versionId,page,selection,scope,focus}=input;
 if(!selection||!scope||scope.page!==page||scope.versionId===versionId||!focus||focus.projectId!==projectId||focus.tab!=='boutique')return false;
 const target=focus.target;
 return target.kind==='theme-section'&&target.versionId===versionId&&target.template===selection.template&&target.section===selection.section&&(target.block??null)===(selection.block??null);
}
