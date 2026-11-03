/** Exception locale bornée, fermée par défaut ; aucune permission générale ou Préparation créée. */
import {localSiteCandidate,localSiteEnabled} from './local-site';
import {localFilesCandidate,localFilesEnabled} from './local-files';
import type {Command} from './contract';
export type ExistingLocalOperation='local-site'|'files';
export type ExistingLocalCapabilities={schema:'existing-local-free-1';ops:ExistingLocalOperation[];confirmationRequired:true;costEur:0;providerCalls:0;financialConsent:false};
export function existingLocalCapabilities():ExistingLocalCapabilities|null{
 if(process.env.STUDIO_CONVERSATION_EXISTING_LOCAL!=='1')return null;
 const ops:ExistingLocalOperation[]=[];
 if(localSiteEnabled())ops.push('local-site');
 if(localFilesEnabled())ops.push('files');
 return ops.length?{schema:'existing-local-free-1',ops,confirmationRequired:true,costEur:0,providerCalls:0,financialConsent:false}:null;
}
export function existingLocalOperation(cmd:Command):ExistingLocalOperation|null{
 if((cmd.action==='confirm-local'||cmd.action==='cancel-local'))return'local-site';
 if(cmd.action==='confirm-files')return'files';
 if(cmd.action!=='message')return null;
 return localFilesCandidate(cmd.text)?'files':localSiteCandidate(cmd.text)?'local-site':null;
}
