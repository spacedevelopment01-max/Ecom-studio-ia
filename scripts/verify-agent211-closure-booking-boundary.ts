/** Closure fixture boundary: code can be implemented while native booking flags stay closed. */
import assert from 'node:assert/strict';
import {all} from '../src/lib/db';
import {studioOperationCatalogue} from '../src/lib/orchestrator/conversation/studio-operations';
type Rows=ReturnType<typeof studioOperationCatalogue>['rows'];
export function assertClosureBookingBoundary(projectId:string,rows:Rows=studioOperationCatalogue(projectId,false).rows){
 const booking=rows.filter(row=>row.tab==='rendez-vous'),create=booking.find(row=>row.id==='appointments.create');
 assert.ok(create,'closure booking creation row missing');
 assert.equal(create.implementation,'absent_from_syna','closure booking creation is still outside this recipe');
 for(const row of booking){
  assert.equal(row.connectionEnabled,false,`booking capability connected in closure fixture: ${row.id}`);
  if(row.implementation==='implemented'){
   assert.equal(row.cost,'free',`native booking cost changed: ${row.id}`);
   assert.ok(['separate_explicit_free_confirmation','none_read_only_no_business_action'].includes(row.confirmation),`native booking confirmation weakened: ${row.id}`);
   assert.equal(row.evidence,'isolated_local_execution',`native booking evidence changed: ${row.id}`);
  }else{
   assert.equal(row.implementation,'absent_from_syna',`unknown booking implementation: ${row.id}`);
   assert.equal(row.cost,'unknown_not_quoted',`unconnected booking was quoted: ${row.id}`);
   assert.equal(row.confirmation,'not_connected',`unconnected booking confirmation changed: ${row.id}`);
  }
 }
 const counts=Object.fromEntries(['salon_appointments','cabinet_appointments','restaurant_reservations'].map(table=>{
  let count:number;
  try{count=all<{n:number}>(`SELECT COUNT(*) n FROM ${table} WHERE project_id=?`,projectId)[0].n;}
  catch(error){if(error instanceof Error&&error.message===`no such table: ${table}`)count=0;else throw error;}
  assert.equal(count,0,`booking record created in closure fixture: ${table}`);return[table,count];
 }));
 return{capabilities:booking.map(({id,implementation,connectionEnabled,cost,confirmation})=>({id,implementation,connectionEnabled,cost,confirmation})),records:counts,appointmentNotBooked:true as const};
}
