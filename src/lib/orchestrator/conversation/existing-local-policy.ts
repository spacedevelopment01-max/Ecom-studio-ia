import {bookingHoursCandidate,bookingHoursEnabled} from './local-booking-hours';
import {bookingClosuresCandidate,bookingClosuresEnabled} from './local-booking-closures';
import {restaurantSettingsCandidate} from './local-restaurant-settings';
import {bookingRecordsEnabled} from './local-booking-records';
import {bookingAvailabilityEnabled} from './local-booking-availability';
import {bookingWorkshopsEnabled} from './local-booking-workshops';
/** Exception locale bornée, fermée par défaut ; aucune permission générale ou Préparation créée. */
import {localSiteCandidate,localSiteEnabled} from './local-site';
import {localFilesCandidate,localFilesEnabled} from './local-files';
import {localFolderRenameCandidate,localFolderRenameEnabled} from './local-folder-rename';
import {localFolderMoveCandidate,localFolderMoveEnabled} from './local-folder-move';
import {localPromptsEnabled} from './local-prompts';
import type {Command} from './contract';
export type ExistingLocalOperation='booking-closures'|'booking-hours'|'local-site'|'files'|'folder-rename'|'folder-move';
export type ExistingLocalCapabilities={schema:'existing-local-free-1';ops:ExistingLocalOperation[];confirmationRequired:true;costEur:0;providerCalls:0;financialConsent:false};
export type ExistingLocalReadCapabilities={schema:'existing-local-read-1';ops:('prompts'|'booking-records'|'booking-availability'|'booking-workshops')[];readOnly:true;confirmationRequired:false;costEur:0;providerCalls:0;financialConsent:false};
export function existingLocalReads(bookingRecordsProject=false):ExistingLocalReadCapabilities|null{
 const ops:ExistingLocalReadCapabilities['ops']=[];
 if(process.env.STUDIO_CONVERSATION_EXISTING_PROMPTS_READ==='1'&&localPromptsEnabled())ops.push('prompts');
 if(bookingRecordsProject&&process.env.STUDIO_CONVERSATION_EXISTING_BOOKING_RECORDS_READ==='1'&&bookingRecordsEnabled())ops.push('booking-records');
 if(bookingRecordsProject&&process.env.STUDIO_CONVERSATION_EXISTING_BOOKING_AVAILABILITY_READ==='1'&&bookingAvailabilityEnabled())ops.push('booking-availability');
 if(bookingRecordsProject&&process.env.STUDIO_CONVERSATION_EXISTING_BOOKING_WORKSHOPS_READ==='1'&&bookingWorkshopsEnabled())ops.push('booking-workshops');
 return ops.length?{schema:'existing-local-read-1',ops,readOnly:true,confirmationRequired:false,costEur:0,providerCalls:0,financialConsent:false}:null;
}
export function existingLocalCapabilities(bookingProject=false):ExistingLocalCapabilities|null{
 if(process.env.STUDIO_CONVERSATION_EXISTING_LOCAL!=='1')return null;
 const ops:ExistingLocalOperation[]=[];
 if(bookingProject&&process.env.STUDIO_CONVERSATION_EXISTING_BOOKING_CLOSURES==='1'&&bookingClosuresEnabled())ops.push('booking-closures');
 if(bookingProject&&process.env.STUDIO_CONVERSATION_EXISTING_BOOKING_HOURS==='1'&&bookingHoursEnabled())ops.push('booking-hours');
 if(localSiteEnabled())ops.push('local-site');
 if(localFilesEnabled())ops.push('files');
 if(process.env.STUDIO_CONVERSATION_EXISTING_FOLDER_RENAME==='1'&&localFolderRenameEnabled())ops.push('folder-rename');
 if(process.env.STUDIO_CONVERSATION_EXISTING_FOLDER_MOVE==='1'&&localFolderMoveEnabled())ops.push('folder-move');
 return ops.length?{schema:'existing-local-free-1',ops,confirmationRequired:true,costEur:0,providerCalls:0,financialConsent:false}:null;
}
export function existingLocalOperation(cmd:Command):ExistingLocalOperation|null{
 if(cmd.action==='confirm-booking-closures'||cmd.action==='cancel-booking-closures')return'booking-closures';
 if(cmd.action==='confirm-booking-hours'||cmd.action==='cancel-booking-hours')return'booking-hours';
 if(cmd.action==='confirm-folder-rename'||cmd.action==='cancel-folder-rename')return'folder-rename';
 if(cmd.action==='confirm-folder-move'||cmd.action==='cancel-folder-move')return'folder-move';
 if((cmd.action==='confirm-local'||cmd.action==='cancel-local'))return'local-site';
 if(cmd.action==='confirm-files')return'files';
 if(cmd.action!=='message')return null;
 return bookingClosuresCandidate(cmd.text)?'booking-closures':bookingHoursCandidate(cmd.text)&&!bookingClosuresCandidate(cmd.text)&&!restaurantSettingsCandidate(cmd.text)?'booking-hours':localFolderRenameCandidate(cmd.text)?'folder-rename':localFolderMoveCandidate(cmd.text)?'folder-move':localFilesCandidate(cmd.text)?'files':localSiteCandidate(cmd.text)?'local-site':null;
}
