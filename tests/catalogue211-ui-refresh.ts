/** Contrôle de la vraie liste visible, distinct du reçu et de la lecture SQL. Aucune mutation. */
import type {Page} from 'playwright';
export async function verifyVisibleCatalogueRow(page:Page,product:{id:string|null;status:string;data:{title:string}}){
 const row=page.locator('[data-catalogue-product="'+product.id+'"]');
 if(product.status==='archived')await row.waitFor({state:'detached'});
 else await row.getByText(product.data.title,{exact:true}).waitFor({timeout:15000});
}
