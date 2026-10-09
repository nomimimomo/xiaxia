import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultGroupName,interactionMethods} from '../interaction.js';
import {parseChatResponse} from '../features.js';
test('默认群名包括用户及总人数；改名消息必须来自群成员',()=>{
 assert.equal(defaultGroupName('阿米',['ako','chimera']),'阿米、ako、chimera（3）');
 const raw=JSON.stringify({messages:[{contactId:'a',kind:'group_name',text:'换个名字',groupName:'茶馆'}]});
 assert.equal(parseChatResponse(raw,['a'],'chat','',null)[0].groupName,'茶馆');
 assert.throws(()=>parseChatResponse(raw,['b'],'chat','',null),/非本会话/);
});
test('发送失败重试只指定原消息；失败后清除重试目标',async()=>{
 const methods=interactionMethods({});const app={...methods,conversation:()=>({messages:[{id:'x',side:'user'}]}),gen:{busy:false},send:async function(){assert.equal(this.retryTarget,'x');throw Error('network');}};
 await assert.rejects(app.retryMessage('x'));assert.equal(app.retryTarget,null);
});
test('重复点击不重复提交，异常后恢复按钮',async()=>{
 let finish,count=0;const methods=interactionMethods({});const app={...methods,updateBusyButtons(){},action:()=>{count++;return new Promise(r=>finish=r);}};
 const p=app.dispatch('send');await app.dispatch('send');assert.equal(count,1);finish();await p;assert.equal(app.pendingActions.size,0);
});
