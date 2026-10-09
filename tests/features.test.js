import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../core.js';
import { upgradeFeatures, features, activePublishers, followPublisher, feedSignature, parseChatResponse, parseArticles, compileLocalMacros } from '../features.js';
import { convertText } from '../text-script.js';

test('1.0升级保留会话/开关/文章，默认港媒号不重复添加，取消关注不被升级还原',()=>{
 const s=freshState();s.conversations=[{id:'c',members:['a'],messages:[{text:'旧记录'}],turns:[]}];s.worlds.w={news:{items:[{body:'旧文章'}]}};
 upgradeFeatures(s);const ids=s.publishers.map(p=>p.id);s.publishers[0].followed=false;upgradeFeatures(s);
 assert.deepEqual(s.publishers.map(p=>p.id),ids);assert.equal(s.publishers[0].followed,false);assert.equal(s.conversations[0].messages[0].text,'旧记录');assert.equal(s.worlds.w.news.items[0].body,'旧文章');assert.equal(s.settings.feeds.news.auto,false);assert.equal(features(s.conversations[0]).mode,'chat');
});
test('同名公众号同范围不重复，故事范围隔离，取消订阅后无生成候选',()=>{
 const s=upgradeFeatures(freshState());s.publishers[0].followed=false;
 const p={name:'巷口吃什么',intro:'简介',topics:'小吃',style:'亲切',script:'simplified',scope:'a'};
 const a=followPublisher(s,p),b=followPublisher(s,{...p,name:' 巷口吃什么 '});assert.equal(a.id,b.id);assert.equal(activePublishers(s,'a').length,1);assert.equal(activePublishers(s,'b').length,0);
 a.followed=false;assert.equal(activePublishers(s,'a').length,0);followPublisher(s,p);assert.equal(s.publishers.length,2);
});
test('公众号设置或订阅改变会使新闻更新标识改变，不影响朋友圈标识',async()=>{
 const s=upgradeFeatures(freshState()),ctx={key:'story',signature:'same'};
 const first=await feedSignature(ctx,'news',s);s.publishers[0].topics='美食';assert.notEqual(await feedSignature(ctx,'news',s),first);assert.equal(await feedSignature(ctx,'moments',s),'same');
});
test('聊天推荐只返回名片，候选和讨论分开，非成员和错模式拒绝',()=>{
 const ref={key:'story',floor:2,signature:'x'},s=upgradeFeatures(freshState());
 const json=JSON.stringify({messages:[{contactId:'a',kind:'text',text:'先别着急'},{contactId:'a',kind:'option',text:'我推开茶馆的门。',reader:'栗子er',optionType:'日常'},{contactId:'a',kind:'publisher',text:'看看这个号',publisher:{name:'食报',intro:'街边小店',topics:'小吃',style:'轻松'}}]});
 const out=parseChatResponse(json,['a'],'choices','story',ref,8);assert.equal(out[1].contextRef.floor,2);assert.equal(out[2].publisher.scope,'story');assert.equal(out[2].publisher.script,'simplified');assert.equal(s.publishers.length,1);
 assert.throws(()=>parseChatResponse(json,['a'],'chat','story',ref));assert.throws(()=>parseChatResponse(json,['other'],'choices','story',ref));
});
test('文章必须来自已关注公众号且具备标题摘要正文',()=>{
 const ps=[{id:'p',name:'港媒号'}];const r=parseArticles('{"items":[{"publisherId":"p","title":"开张","summary":"新店","body":"正文"}]}',4,ps);assert.equal(r[0].author,'港媒号');
 assert.throws(()=>parseArticles('{"items":[{"publisherId":"unknown","title":"x","summary":"x","body":"x"}]}',4,ps));assert.throws(()=>parseArticles('{"items":[{"publisherId":"p","title":"x","body":"x"}]}',4,ps));
});
test('示例choice宏只在单次请求内展开，原预设和另一请求不受影响',()=>{
 const source=[{role:'system',content:'{{setvar::choice::根据 [群聊状态栏]生成行动选项}}\n{{getvar::choice}}'}];const original=JSON.stringify(source),x=compileLocalMacros(source);
 assert.equal(x.vars.choice,'根据 [群聊状态栏]生成行动选项');assert.match(x.messages[0].content,/根据 \[群聊状态栏\]生成行动选项/);assert.equal(JSON.stringify(source),original);assert.deepEqual(compileLocalMacros([]).vars,{});
});
test('港媒繁体转简体不改变口吻，繁体选项亦可独立使用',async()=>{
 assert.equal(await convertText('燒鵝店開張，街坊話抵食。','simplified'),'烧鹅店开张，街坊话抵食。');
 assert.equal(await convertText('烧鹅店开张','traditional'),'燒鵝店開張');
});
