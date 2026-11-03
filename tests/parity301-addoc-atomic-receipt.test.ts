/** Red on parent338: native save ignored receipt callback; green ensures same transaction rollback. */
import{it,expect,vi}from'vitest';
import sharp from'sharp';
import{account,project}from'./conversation209-fixtures';
import{saveVersion,saveAndRender,latestDoc}from'@/lib/ad-doc/store';
import{all,id}from'@/lib/db';
import*as renderer from'@/lib/ad-doc/server';
import type{AdDocument}from'@/lib/ad-doc/types';
it('receipt failure must prevent committing a new native document or its rendered asset',async()=>{const u=await account(),pid=project(u),key='ad:'+id(),d={version:1,width:120,height:120,background:'#FFFFFF',safe:{top:0,bottom:0,side:0},format:{platform:null,aspect:'1:1'},brand:{palette:{},fonts:{heading:'Arial',body:'Arial'},name:'Fictif'},layers:[],meta:{source:'user',conceptId:null,createdFrom:null}}as AdDocument;saveVersion(pid,key,d);const image=await sharp({create:{width:120,height:120,channels:3,background:'#fff'}}).jpeg().toBuffer(),spy=vi.spyOn(renderer,'renderDocToBuffer').mockResolvedValue(image),before={docs:all('SELECT * FROM ad_documents WHERE project_id=?',pid),assets:all('SELECT * FROM assets WHERE project_id=?',pid)};try{await expect(saveAndRender(pid,u.id,key,d,'receipt test',{expectedVersion:1,commit:()=>{throw Error('Receipt failure');}})).rejects.toThrow('Receipt failure');expect(all('SELECT * FROM ad_documents WHERE project_id=?',pid)).toEqual(before.docs);expect(all('SELECT * FROM assets WHERE project_id=?',pid)).toEqual(before.assets);expect(latestDoc(pid,key)!.version.version).toBe(1);}finally{spy.mockRestore();}});
