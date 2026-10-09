import test from 'node:test';
import assert from 'node:assert/strict';
import { Diagnostics } from '../diagnostics.js';
test('日志失败后保留步骤及阻塞原因，清理活动任务且不记录正文密钥',async()=>{
 let saved='';const storage={getItem:()=>saved,setItem:(k,v)=>saved=v};const d=new Diagnostics(storage);
 d.log('metadata',{key:'secret',text:'private',count:2});
 await assert.rejects(d.run('send',()=>{throw Error('酒馆正在生成 secret');},()=>({mainBusy:true})));
 assert.equal(d.active.size,0);assert.equal(d.rows.find(r=>r.event==='failure').reason,'tavern_busy');
 assert.ok(!d.report().includes('secret'));assert.ok(!d.report().includes('private'));
 assert.equal(new Diagnostics(storage).rows.length,d.rows.length);
 for(let i=0;i<510;i++)d.log('test');assert.equal(d.rows.length,500);
});
test('日志保存失败不影响业务操作',async()=>{const d=new Diagnostics({getItem(){throw Error();},setItem(){throw Error();}});assert.equal(await d.run('test',()=>42),42);assert.equal(d.persistence,false);});
