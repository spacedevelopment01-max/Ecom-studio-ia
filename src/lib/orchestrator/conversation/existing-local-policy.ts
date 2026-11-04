/** Exception locale bornée, fermée par défaut ; aucune permission générale ou Préparation créée. */
import {localSiteCandidate,localSiteEnabled} from './local-site';
import {localFilesCandidate,localFilesEnabled} from './local-files';
import {localFolderRenameCandidate,localFolderRenameEnabled} from './local-folder-rename';
import {localFolderMoveCandidate,localFolderMoveEnabled} from './local-folder-move';
import {localPromptsEnabled} from './local-prompts';
import type {Command} from './contract';
export type ExistingLocalOperation='local-site'|'files'|'folder-rename'|'folder-move';
export type ExistingLocalCapabilities={schema:'existing-local-free-1';ops:ExistingLocalOperation[];confirmationRequired:true;costEur:0;providerCalls:0;financialConsent:false};
export type ExistingLocalReadCapabilities={schema:'existing-local-read-1';ops:'prompts'[];readOnly:true;confirmationRequired:false;costEur:0;providerCalls:0;financialConsent:false};
export function existingLocalReads():ExistingLocalReadCapabilities|null{
 return process.env.STUDIO_CONVERSATION_EXISTING_PROMPTS_READ==='1'&&localPromptsEnabled()?{schema:'existing-local-read-1',ops:['prompts'],readOnly:true,confirmationRequired:false,costEur:0,providerCalls:0,financialConsent:false}:null;
}
export function existingLocalCapabilities():ExistingLocalCapabilities|null{
 if(process.env.STUDIO_CONVERSATION_EXISTING_LOCAL!=='1')return null;
 const ops:ExistingLocalOperation[]=[];
 if(localSiteEnabled())ops.push('local-site');
 if(localFilesEnabled())ops.push('files');
 if(process.env.STUDIO_CONVERSATION_EXISTING_FOLDER_RENAME==='1'&&localFolderRenameEnabled())ops.push('folder-rename');
 if(process.env.STUDIO_CONVERSATION_EXISTING_FOLDER_MOVE==='1'&&localFolderMoveEnabled())ops.push('folder-move');
 return ops.length?{schema:'existing-local-free-1',ops,confirmationRequired:true,costEur:0,providerCalls:0,financialConsent:false}:null;
}
export function existingLocalOperation(cmd:Command):ExistingLocalOperation|null{
 if(cmd.action==='confirm-folder-rename'||cmd.action==='cancel-folder-rename')return'folder-rename';
 if(cmd.action==='confirm-folder-move'||cmd.action==='cancel-folder-move')return'folder-move';
 if((cmd.action==='confirm-local'||cmd.action==='cancel-local'))return'local-site';
 if(cmd.action==='confirm-files')return'files';
 if(cmd.action!=='message')return null;
 return localFolderRenameCandidate(cmd.text)?'folder-rename':localFolderMoveCandidate(cmd.text)?'folder-move':localFilesCandidate(cmd.text)?'files':localSiteCandidate(cmd.text)?'local-site':null;
}
