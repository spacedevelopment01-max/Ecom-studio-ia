/** Ratio explicite du visuel ; les anciens brouillons conservent le défaut natif du réseau. */
import{z}from 'zod';import{platformSpec}from './platforms';import type{AspectId}from '../image-v2/types';
export const PublicationAspectSchema=z.enum(['1:1','4:5','9:16','16:9']);
export type PublicationAspect=z.infer<typeof PublicationAspectSchema>;
export function postVisualAspect(post:{network:string;format:string;aspect?:unknown}):AspectId{
 if(post.aspect!==undefined)return PublicationAspectSchema.parse(post.aspect);
 const dims=platformSpec(post.network).dims;return(dims[post.format as keyof typeof dims]?.aspect as AspectId|undefined)??'4:5';
}
/** Aucun étirement ni substitution de proportions lors d’un réemploi explicite. */
export function matchesPostAspect(asset:{width:number|null;height:number|null},post:{network:string;format:string;aspect?:unknown}){
 if(post.aspect===undefined)return true;const[a,b]=postVisualAspect(post).split(':').map(Number);return!!asset.width&&!!asset.height&&Math.abs(asset.width/asset.height-a/b)<.005;
}
