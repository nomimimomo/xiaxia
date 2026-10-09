import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()] }));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let stored = null;
const fixture = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/fonts/400.css"><style>#shrimp-app{font-family:"Noto Sans SC",sans-serif}</style></head><body><div id="extensionsMenu"></div><button id="send_but" onclick="window.sent=(window.sent||0)+1">send</button><textarea id="send_textarea"></textarea><script>
window.calls=[];window.failNext=false;window.notices=[];window.listeners={};window.toastr={error:x=>notices.push(x)};
const preset={prompts:[{identifier:'persona',name:'Ako人格',content:'你是Ako，一个爱聊天的诗人。'},{identifier:'off',name:'conversation关闭条目',content:'绝不执行我'},{identifier:'loose',name:'未链接',content:'不执行孤立条目'},{identifier:'choices',name:'行动选项条目',content:'{{setvar::choice::根据 [群聊状态栏]生成行动选项}} {{getvar::choice}}'}],prompt_order:[{character_id:100001,order:[{identifier:'persona',enabled:true},{identifier:'off',enabled:false},{identifier:'choices',enabled:false}]}]};
window.preset=preset;window.originalPreset=JSON.stringify(preset);
const c={name1:'Ameki',name2:'叶知微',characterId:0,chatId:'story-one',groupId:null,characters:[{name:'叶知微',avatar:'ye.png',description:'药王谷医者',data:{description:'药王谷医者',extensions:{world:'谷中日常'}}}],chat:[{name:'叶知微',mes:'今日城南开了新茶铺。',is_user:false}],powerUserSettings:{persona_description:'旅人'},chatMetadata:{},extensionSettings:{},getRequestHeaders:()=>({'Content-Type':'application/json'}),getThumbnailUrl:()=>'',getCurrentChatId:()=>c.chatId,eventTypes:{GENERATION_STARTED:'start',GENERATION_ENDED:'end',GENERATION_STOPPED:'stop',MESSAGE_RECEIVED:'received',CHARACTER_MESSAGE_RENDERED:'render',MESSAGE_EDITED:'edit',MESSAGE_DELETED:'delete',CHAT_CHANGED:'chat',APP_READY:'ready'},eventSource:{on:(n,f)=>(listeners[n]||=[]).push(f)},getPresetManager:()=>({getPresetList:()=>({preset_names:{'Ako 1.92':0,'Ako 1.93':1}}),getSelectedPresetName:()=> 'Ako 1.92',getCompletionPresetByName:name=>name==='Ako 1.93'?{...structuredClone(preset),model:'v2'}:preset}),generateRaw:async ({prompt})=>{calls.push(prompt);await new Promise(r=>setTimeout(r,80));if(failNext){failNext=false;throw Error('模拟断网');}const sys=prompt.find(p=>p.content.includes('成员：'));if(sys){const members=JSON.parse(sys.content.split('成员：')[1]);const last=JSON.parse([...prompt].reverse().find(p=>p.role==='user').content);if(sys.content.includes('当前是持续的选项模式') && !last.text?.includes('先讨论')) return JSON.stringify({messages:[{contactId:members[0].contactId,kind:'text',text:'先看看这两种走法'},{contactId:members[0].contactId,kind:'option',reader:'栗子er',optionType:'日常生活发展选项',text:'我走进茶馆，要了一壶热茶。'},{contactId:members[0].contactId,kind:'option',reader:'Ako',optionType:'ako如果是User选项',text:'我在门前停下，问掌柜今日有什么点心。'}]});if(last.text?.includes('推荐'))return JSON.stringify({messages:[{contactId:members[0].contactId,kind:'publisher',text:'这家号就爱找街边小店',publisher:{name:'巷口吃什麼',intro:'帶你看看當地街邊小店',topics:'美食、街边小吃、平价探店',style:'活泼亲切，像朋友推荐好吃的小店',script:'simplified'}}]});return JSON.stringify({messages:[{contactId:members[0].contactId,text:'我想听你说。'},{contactId:members[0].contactId,text:'慢慢聊，不着急。'}]});}if(prompt[0].content.includes('资料提取器'))return JSON.stringify({people:[{name:'Ako',bio:'我爱写诗，也爱聊天。',evidence:[{id:'persona',quote:'你是Ako，一个爱聊天的诗人。'}]}]});const pubs=JSON.parse(prompt[1].content).subscribedPublishers;if(pubs)return JSON.stringify({items:pubs.map(p=>({publisherId:p.id,title:'燒鵝店開張',summary:'街坊又有新去處',body:'城南新店開門迎客，街坊前來試味。記者走訪小店，見店中茶香四溢，招牌燒鵝剛剛出爐。掌櫃表示，鋪面雖小，食材都是清早挑選，不求花巧，只盼客人吃得稱心。門前排隊的食客有熟面孔，也有路過的新客。有街坊說，好不好吃，終究還要自己試過才知，消息尚待更多回應。'}))});return JSON.stringify({items:[{author:'城南茶馆',title:'今日新茶',body:'店门开了，第一壶茶已经沏好。'}]});}};
window.context=c;window.emit=(n,...a)=>Promise.all((listeners[n]||[]).map(f=>f(...a)));window.SillyTavern={getContext:()=>c};
</script><script type="module" src="/index.js"></script></body></html>`;
const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/fonts/') && process.env.SHRIMP_TEST_FONTS) { try {res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'font/woff2');return res.end(await readFile(resolve(process.env.SHRIMP_TEST_FONTS, path.slice(7))));}catch{res.statusCode=404;return res.end();}}
    if (path === '/') { res.setHeader('Content-Type', 'text/html'); return res.end(fixture); }
    if (path === '/script.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end('export const isGenerating=()=>false;'); }
    if (path === '/scripts/world-info.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end('export const selected_world_info=[];export const world_info={};export const loadWorldInfo=async()=>({entries:{one:{content:"城南是一座寻常小城。",comment:"地理",disable:false}}});'); }
    if (path === '/user/files/ame-shrimp-v1.json') { res.setHeader('Content-Type', 'application/json'); res.statusCode = stored ? 200 : 404; return res.end(stored || '{}'); }
    if (path === '/api/files/upload') { let b='';for await(const part of req)b+=part;stored=Buffer.from(JSON.parse(b).data,'base64').toString();res.setHeader('Content-Type','application/json');return res.end('{"path":"user/files/ame-shrimp-v1.json"}'); }
    try { res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(await readFile(resolve(root, '.' + path))); } catch { res.statusCode=404;res.end(); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser = await chromium.launch({ headless: true, ...(process.env.SHRIMP_CHROMIUM ? {executablePath:process.env.SHRIMP_CHROMIUM} : {}), args: ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'], timeout: 20000 });
const base = `http://127.0.0.1:${server.address().port}`;
const page = await browser.newPage({ viewport: { width: 1300, height: 850 } });
page.setDefaultTimeout(10000);page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log('UI',m.text());});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const click = async (a,id) => { console.log('click',a,id||''); const selector = `[data-action="${a}"]${id?`[data-id="${id}"]`:''}:visible`; const modal = page.locator('.shr-modal ' + selector); return (await modal.count() ? modal : page.locator(selector)).first().click(); };
const saved = async()=>{await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent==='已保存到酒馆');};
try {
    await page.goto(base);await page.locator('#shrimp-launcher').click();await click('tab','contacts');await click('identify');await page.getByRole('dialog').waitFor();await click('acceptPeople');await saved();
    assert.equal(JSON.parse(stored).data.contacts.length,1);
    const id=JSON.parse(stored).data.contacts[0].id;
    await click('card',id);assert.match(await page.getByRole('dialog').innerText(),/Ako 1.92/);await click('private',id);
    await page.locator('#shr-draft').fill('你好！');await page.locator('#shr-draft').press('Enter');await saved();assert.equal(await page.locator('.shr-message').count(),1);
    await page.evaluate(()=>{const b=document.querySelector('[data-action=send]');b.click();b.click();});await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent==='回复完成');assert.equal(await page.locator('.shr-message').count(),3);
    assert.equal(await page.evaluate(()=>JSON.stringify(preset)===originalPreset),true);
    assert.equal(await page.evaluate(()=>JSON.stringify(calls.at(-1)).includes('绝不执行我')),false);
    await page.screenshot({path:resolve(root,'../desktop-qa.png')});
    await page.evaluate(()=>failNext=true);await click('send');await page.waitForFunction(()=>notices.includes('模拟断网'));assert.equal(await page.locator('.shr-message').count(),3);
    await click('send');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent==='回复完成');assert.equal(await page.locator('.shr-message').count(),3);
    await click('share');await click('shareCards');await page.locator('input[name=cards]').check();await click('attachCards');await saved();assert.equal(JSON.parse(stored).data.conversations[0].messages.at(-1).attachment.data[0].name,'叶知微');
    await click('tab','me');await click('settings');await page.locator('[name=presetName]').selectOption('Ako 1.93');await click('saveSettings');await saved();await click('tab','contacts');await click('identify');await page.getByRole('dialog').waitFor();await click('acceptPeople');await saved();
    assert.equal(JSON.parse(stored).data.contacts.length,2);assert.notEqual(JSON.parse(stored).data.contacts[0].sourceId,JSON.parse(stored).data.contacts[1].sourceId);
    await click('group');await page.locator('[name=members]').first().check();await page.locator('[name=members]').nth(1).check();await page.locator('[name=title]').fill('Ako 同名群');await click('saveGroup');await saved();assert.equal(JSON.parse(stored).data.conversations.at(-1).members.length,2);
    await click('tab','discover');await click('tab','moments');await click('refresh','moments');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent?.includes('去重保存'));assert.equal(await page.locator('.shr-feed article').count(),1);
    await click('refresh','moments');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent?.includes('去重保存'));assert.equal(await page.locator('.shr-feed article').count(),1);
    await page.evaluate(async()=>{context.chatId='story-two';await emit('chat');});assert.equal(await page.locator('.shr-feed article').count(),0);
    await page.evaluate(async()=>{context.chatId='story-one';await emit('chat');});assert.equal(await page.locator('.shr-feed article').count(),1);
    await click('tab','me');await click('feedSettings');await page.locator('[name=newsAuto]').check();await click('saveFeedSettings');await saved();
    await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent?.includes('去重保存'));const autoCalls=await page.evaluate(()=>calls.length);
    await page.evaluate(async()=>{await emit('received');await emit('render');await emit('end');});await page.waitForTimeout(2300);assert.equal(await page.evaluate(()=>calls.length),autoCalls);
    await page.evaluate(async()=>{context.chat[0].mes='城南茶馆已经歇业。';await emit('edit');});await page.waitForTimeout(2300);assert.equal(await page.evaluate(()=>calls.length),autoCalls);assert.equal(Object.values(JSON.parse(stored).data.worlds)[0].moments.items[0].stale,true);
    await click('tab','discover');await click('tab','moments');
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(root,'../mobile-feed-qa.png')});
    await click('tab','chats');await click('conversation',JSON.parse(stored).data.conversations[0].id);await page.screenshot({path:resolve(root,'../mobile-chat-qa.png')});
    assert.equal(await page.evaluate(()=>document.querySelector('#shrimp-app').scrollWidth>innerWidth),false);
    await page.reload();await page.locator('#shrimp-launcher').click();await click('tab','contacts');assert.equal(await page.locator('.shr-contact-main').count(),2);
    await page.setViewportSize({width:1300,height:850});
    await click('tab','chats');await click('conversation',JSON.parse(stored).data.conversations[0].id);
    await click('chatFeatures');await page.locator('[name=mode]').selectOption('choices');await page.locator('[name=voice]').selectOption('char');await page.locator('details').filter({hasText:'进入选项模式时启用'}).locator('summary').click();await page.locator('label').filter({hasText:'行动选项条目'}).locator('input').check();await click('saveChatFeatures');await saved();
    await click('generateChoices');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent==='回复完成');
    assert.equal(await page.locator('[data-action=chooseOption]').count(),2);
    assert.equal(await page.evaluate(()=>JSON.stringify(calls.at(-1)).includes('根据 [群聊状态栏]生成行动选项')),true);
    assert.equal(await page.evaluate(()=>JSON.stringify(preset)===originalPreset),true);
    assert.equal(await page.evaluate(()=>JSON.stringify(calls.at(-1)).includes('storyContext')),true);
    await page.screenshot({path:resolve(root,'../desktop-choices-qa.png')});
    await page.locator('#shr-draft').fill('先讨论一下，不急着给新选项');await click('send');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent==='回复完成');assert.equal(await page.locator('[data-action=chooseOption]').count(),2);assert.match(await page.locator('.shr-mode-bar').innerText(),/选项模式/);
    await page.evaluate(()=>document.querySelector('#send_textarea').value='已经写好的开头');await click('chooseOption');await click('injectAppend');assert.equal(await page.locator('#send_textarea').inputValue(),'已经写好的开头\n我走进茶馆，要了一壶热茶。');assert.equal(await page.evaluate(()=>window.sent||0),0);
    await page.locator('#shrimp-launcher').click();await page.evaluate(()=>{context.chatId='another-story';});await click('chooseOption');await page.waitForFunction(()=>notices.some(n=>n.includes('另一个酒馆聊天')));assert.equal(await page.evaluate(()=>window.sent||0),0);await page.evaluate(()=>{context.chatId='story-one';});
    await page.evaluate(()=>document.querySelector('#send_textarea').value='');await click('chooseOption');await page.waitForFunction(()=>document.querySelector('#send_textarea').value==='我走进茶馆，要了一壶热茶。');assert.equal(await page.locator('#send_textarea').inputValue(),'我走进茶馆，要了一壶热茶。');await page.locator('#shrimp-launcher').click();
    await click('leaveChoices');await saved();await page.locator('#shr-draft').fill('推荐一个这个世界的美食公众号');await click('send');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent==='回复完成');
    assert.equal(JSON.parse(stored).data.publishers.length,1);assert.match(await page.locator('.shr-publisher-card').innerText(),/巷口吃什么/);await click('followSuggested');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent?.includes('已关注'));assert.equal(JSON.parse(stored).data.publishers.length,2);
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(root,'../mobile-recommendation-qa.png')});await click('back');await click('tab','discover');await click('tab','news');await click('refresh','news');await page.waitForFunction(()=>document.querySelector('.shr-status')?.textContent?.includes('去重保存'));assert.match(await page.locator('.shr-feed').innerText(),/烧鹅店开张/);assert.equal(await page.locator('.shr-article-summary').count()>0,true);
    await page.screenshot({path:resolve(root,'../mobile-news-qa.png')});
    await click('publishers');const custom=JSON.parse(stored).data.publishers.find(p=>p.id!=='builtin-hk');await click('editPublisher',custom.id);await page.locator('[name=style]').fill('只写朴素街头小吃，不推荐昂贵餐厅');await click('savePublisher');await page.locator('.shr-modal [data-action=editPublisher]').first().waitFor();await click('dismiss');
    await page.reload();await page.locator('#shrimp-launcher').click();await click('tab','chats');await click('conversation',JSON.parse(stored).data.conversations[0].id);await click('enterChoices');await saved();await page.reload();await page.locator('#shrimp-launcher').click();await click('conversation',JSON.parse(stored).data.conversations[0].id);assert.match(await page.locator('.shr-mode-bar').innerText(),/选项模式/);await click('back');await click('tab','contacts');
    // Another device's newer write must not be overwritten.
    stored=JSON.stringify({...JSON.parse(stored),revision:'external-change'});
    await click('add');await page.locator('[name=name]').fill('本页草稿');await click('saveContact');await page.waitForFunction(()=>notices.some(s=>s.includes('其他页面或设备')));assert.equal(JSON.parse(stored).revision,'external-change');
    assert.deepEqual(errors,[]);
    console.log('PASS browser: identify, same-name versions, private/group, batches, retry rollback, attachments, prompt isolation, feeds/dedup/story isolation, persistence, 390px layout.');
} catch(e) {console.log('STATE',await page.locator('#shrimp-app').innerText());await page.screenshot({path:resolve(root,'../failed-qa.png')});throw e;} finally {await browser.close();server.close();}
