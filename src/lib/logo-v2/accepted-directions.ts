/** Territoires IA déjà acquis par SYNA : validation native, jamais de remplissage ou génération locale. */
import {z} from 'zod';
import {TerritorySchema,selectTerritories,type TerritoryDraft} from './territories';
import {DirectionIdentitySchema,directionSetIssues} from './direction-series';
import {directionSeriesPaletteIssues} from './direction-palette';
import {LOGO_STYLES,type BrandBrief,type Territory} from './types';
const role=z.enum(['primary','secondary','accent','light','dark']);
export const AcceptedTerritorySchema=TerritorySchema.extend({
 identity:DirectionIdentitySchema,
 typography:z.object({style:TerritorySchema.shape.typography.shape.style,weight:z.enum(['light','regular','bold','black']),case:z.enum(['upper','title','lower']),tracking:z.enum(['tight','normal','wide']),rationale:z.string().min(1).max(300)}).strict(),
 colorRole:z.object({ink:role,accent:role,rationale:z.string().min(1).max(300)}).strict(),
 sobriety:z.number().min(1).max(5),symbolIdea:z.string().max(400).nullable(),distinctive:z.string().min(1).max(400),avoid:z.array(z.string().max(120)).max(8),
 style:z.enum(LOGO_STYLES),descriptor:z.string().min(1).max(60).nullable(),imageBrief:z.string().min(30).max(1600),colors:z.array(z.string().regex(/^#[a-f0-9]{6}$/i)).max(4),
}).strict();
export const AcceptedDirectionsSchema=z.array(AcceptedTerritorySchema).length(3);
/** Refuse les ajouts commerciaux ; le moteur garde sa composition et ses garde-fous de diversité. */
export function acceptedDirections(drafts:unknown,brief:BrandBrief):Territory[]{
 const parsed=AcceptedDirectionsSchema.parse(drafts),activities=new Set(brief.activities.map(s=>s.replace(/\s+/g,' ').trim().toLocaleUpperCase('fr-FR')));
 for(const t of parsed){
  if(t.descriptor&&!t.descriptor.split(' • ').every(part=>activities.has(part)))throw Error('logo_descriptor_not_client_activity');
  if(t.colors.some(c=>!Object.values(t.identity.palette).some(p=>p.toLowerCase()===c.toLowerCase())))throw Error('logo_colours_outside_direction_palette');
 }
 const selected=selectTerritories(parsed as TerritoryDraft[],brief,3);
 if(selected.rejected.length||selected.kept.length!==3)throw Error('logo_directions_not_distinct_or_refused');
 if(selected.kept.some((t,i)=>t.descriptor!==parsed[i].descriptor))throw Error('logo_descriptor_would_be_changed');
 const issues=[...directionSetIssues(selected.kept),...directionSeriesPaletteIssues(selected.kept.map(t=>t.identity!))];
 if(issues.length)throw Error('logo_directions_incomplete: '+issues.join(' '));
 return selected.kept;
}
/** Même contexte exact au devis et dans le moteur de dessins existant. */
export function directionBrief(brief:BrandBrief,t:Territory,directions:readonly Territory[],preserveClientText=false):BrandBrief{
 return t.identity?{...brief,palette:t.identity.palette,paletteLocked:true,fontsLocked:t.identity.fonts,tagline:preserveClientText?brief.tagline:null,...(preserveClientText?{exactNameCase:true as const}:{}),brainContext:brief.brainContext+'\nDirection complète à contrôler : '+JSON.stringify(t.identity)+'\nPalettes des trois directions à distinguer : '+JSON.stringify(directions.map(d=>({direction:d.name,palette:d.identity?.palette,roles:d.identity?.colorRoles})))}:brief;
}
