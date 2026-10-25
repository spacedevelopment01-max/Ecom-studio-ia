/** Plan gates for user-requested library operations. Installed content is never removed on downgrade. */
import { HttpError } from '../auth';
import { requirePlan, assertAiSections } from '../plan-gates';
import { PLANS } from '../plans';
import { planAllowsSection } from '../plan-entitlements';
import { loadProject } from '../projects';
import { projectKind } from './project-kind';
import { FAMILY_LIBRARY, parseLibraryId } from './section-families';
import { sectionSchema, settingsSchema, containerOf, type ThemeSpec } from './spec';
import type { ThemeOp } from './ops';
import { L } from '../i18n-server';
export function assertLibrarySelection(projectId:string,type:string,existingType?:string,installed=false) {
 const plan=requirePlan(null,projectId),family=projectKind(loadProject(projectId));
 const parsed=parseLibraryId(type);
 if(parsed){if(parsed.entry.family!==family)throw new HttpError(400,L('Section hors de la bibliothèque de la famille de ce projet.','Section outside this project’s family library.'),'section_library_mismatch');if(planAllowsSection(plan,family,parsed.entry.key))return;}
 else {
  if(type===existingType||['header','footer','announcement-bar'].includes(type))return;
  const entries=FAMILY_LIBRARY[family].filter(e=>e.dispositions.some(d=>d.type===type));
  if(entries.some(e=>planAllowsSection(plan,family,e.key)))return;
  // Section propre au thème déjà installée (fg-*, sv-*, pa-*…) : hors bibliothèque de famille, sa copie reste permise.
  if(!entries.length&&installed&&!type.startsWith('es-custom-'))return;
  if(!entries.length&&!type.startsWith('es-custom-'))throw new HttpError(400,L('Section inconnue ou hors de la bibliothèque de cette famille.','Unknown section or outside this family library.'),'section_library_mismatch');
  if(type.startsWith('es-custom-')){assertAiSections(projectId);return;}
 }
 throw new HttpError(402,L(`Cette fonction de section n’est pas accessible avec le forfait ${PLANS[plan].name.fr} (${PLANS[plan].librarySections} fonctions par famille). Les sections déjà installées sont conservées et modifiables.`,`This section function is not available with the ${PLANS[plan].name.en} plan (${PLANS[plan].librarySections} functions per family). Installed sections are kept and editable.`),'plan_upgrade');
}
export function assertThemeOperations(projectId:string,spec:ThemeSpec,ops:ThemeOp[],conversation=false) {
 const plan=requirePlan(null,projectId);
 for(const op of ops){
  if(conversation&&PLANS[plan].themeEditing==='basic'&&!['set_setting','set_global','set_scheme_color','section_colors','element_style','use_media','lock'].includes(op.op))throw new HttpError(402,L('La personnalisation IA basique modifie les textes, images et couleurs. Les changements de structure par conversation nécessitent Développer ou Dominer.','Basic AI editing changes text, images and colours. Structural changes through conversation require Grow or Dominate.'),'plan_upgrade');
  if(conversation&&PLANS[plan].themeEditing==='basic'&&(op.op==='set_setting'||op.op==='set_global')){
    const section=op.op==='set_setting'?containerOf(spec,op.template)?.sections[op.section]:null;
    const schema=section?sectionSchema(spec,section.type):null;
    const definitions=op.op==='set_global'?settingsSchema(spec).flatMap(x=>x.settings??[]):op.op==='set_setting'&&op.block?schema?.blocks.find(x=>x.type===section?.blocks?.[op.block!]?.type)?.settings??[]:schema?.settings??[];
    const type=definitions.find(x=>x.id===op.key)?.type;
    if(!type||!['text','textarea','richtext','inline_richtext','image_picker','color','color_scheme','url','html'].includes(type))throw new HttpError(402,L('Ce réglage dépasse les textes, images et couleurs du mode IA basique. Développer ouvre la personnalisation avancée.','This setting goes beyond basic AI text, image and colour edits. Grow unlocks advanced editing.'),'plan_upgrade');
  }
  if(op.op==='custom_section')assertAiSections(projectId);
  if(!spec.imported&&(op.op==='add_section'||op.op==='replace_section'))assertLibrarySelection(projectId,op.type,op.op==='replace_section'?containerOf(spec,op.template)?.sections[op.section]?.type:undefined);
  if(!spec.imported&&op.op==='duplicate_section')assertLibrarySelection(projectId,containerOf(spec,op.template)?.sections[op.section]?.type??'',undefined,!!containerOf(spec,op.template)?.sections[op.section]);
 }
}
/** Let the bounded native repair path report bad family proposals; never skip another operation's plan check. */
export function assertRepairableConversation(projectId:string,spec:ThemeSpec,ops:ThemeOp[]){
 for(const op of ops)try{assertThemeOperations(projectId,spec,[op],true);}catch(e){
  if(!(e instanceof HttpError&&e.status===400&&e.code==='section_library_mismatch'))throw e;
  // applyOps performs family validation and records this proposal as rejected. It cannot apply it.
 }
}
