import { clone, uid, parseJSON, digest } from './core.js?v=1.2.0';
export const OPTION_TYPES = ['日常生活发展选项', '主线剧情推动选项', '恋爱好感增加选项', '色情场合挑逗选项', '搞笑荒诞尝试选项', '时间进度加速选项', 'ako如果是{{user}}选项', 'chimera如果是{{user}}选项'];
export const defaultPublisher = () => ({ id: 'builtin-hk', name: '街巷来信', intro: '用港媒笔触看故事里的世情与人物。', topics: '当地社会、民生、娱乐、人物传闻、街头见闻', style: '香港本地报刊口吻；标题简洁醒目，记者报道笔触，娱乐话题可有圈内消息、传闻及人物反应。措辞贴合故事所处年代。只借鉴口吻，不把其他世界强行设在香港。', script: 'simplified', followed: true, scope: '*', createdAt: Date.now() });
export const defaultFeatures = () => ({ mode: 'chat', readStory: true, floor: -1, floorKey: '', voice: 'user', customVoice: '', count: 8, types: [...OPTION_TYPES], extra: '', promptToggles: {} });
export function upgradeFeatures(state) {
    if (!Array.isArray(state.publishers)) state.publishers = [defaultPublisher()];
    for (const c of state.conversations) {
        c.features = { ...defaultFeatures(), ...c.features };
        const f=c.features;
        if (!['chat','theatre','choices'].includes(f.mode)) f.mode='chat';
        if (!Array.isArray(f.types)) f.types=[...OPTION_TYPES];
        f.types=f.types.filter(x=>typeof x==='string');
        if (typeof f.voice!=='string') f.voice='user';
        if (!Number.isInteger(f.floor) || f.floor < -1) f.floor=-1;
        if (!Number.isInteger(f.count) || f.count<1 || f.count>20) f.count=8;
        if (!f.promptToggles || typeof f.promptToggles!=='object') f.promptToggles={};
    }
    return state;
}
export function features(c) { return c.features ||= defaultFeatures(); }
export function publisherKey(p) { return String(p.name).normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, '') + '|' + (p.scope || '*'); }
export function activePublishers(state, key) { return (state.publishers || []).filter(p => p.followed && (p.scope === '*' || p.scope === key)); }
export function followPublisher(state, proposed) {
    const key = publisherKey(proposed), existing = state.publishers.find(p => publisherKey(p) === key);
    if (existing) { existing.followed = true; return existing; }
    const value = { ...clone(proposed), id: uid(), followed: true, createdAt: Date.now() };
    state.publishers.push(value); return value;
}
export async function feedSignature(context, type, state) {
    return type === 'news' ? digest({ context: context.signature, publishers: activePublishers(state, context.key).map(p => ({ id: p.id, name: p.name, intro: p.intro, topics: p.topics, style: p.style, script: p.script })) }) : context.signature;
}
export function sanitizePublisher(p, scope) {
    if (!p || !['name', 'intro', 'topics', 'style'].every(k => typeof p[k] === 'string' && p[k].trim())) throw new Error('公众号名片缺少名称、简介、主题或口吻，请让人格重新推荐');
    return { name: p.name.trim().slice(0, 80), intro: p.intro.trim().slice(0, 1000), topics: p.topics.trim().slice(0, 2000), style: p.style.trim().slice(0, 3000), script: ['simplified', 'traditional'].includes(p.script) ? p.script : 'simplified', scope: scope || '*' };
}
export function parseChatResponse(raw, members, mode, scope, contextRef, maxOptions = 8) {
    const data = parseJSON(raw), rows = Array.isArray(data) ? data : data.messages;
    if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new Error('回复缺少有效消息列表');
    const allowed = new Set(members), output = []; let count = 0;
    for (const r of rows) {
        if (!allowed.has(r.contactId)) throw new Error('回复包含非本会话成员，未写入');
        const kind = r.kind || 'text';
        if (!['text', 'option', 'publisher'].includes(kind)) throw new Error('消息类型无法识别');
        if (typeof r.text !== 'string' || (!r.text.trim() && kind !== 'publisher')) throw new Error('回复包含空消息');
        const m = { id: uid(), side: 'ai', contactId: r.contactId, text: r.text.trim(), kind, createdAt: Date.now() };
        if (kind === 'option') {
            if (mode !== 'choices' || !contextRef) throw new Error('尚未进入选项模式，候选未写入');
            if (++count > maxOptions) continue;
            m.reader = String(r.reader || '').slice(0, 80); m.optionType = String(r.optionType || '行动选项').slice(0, 100); m.contextRef = clone(contextRef);
        }
        if (kind === 'publisher') m.publisher = sanitizePublisher(r.publisher, scope);
        output.push(m);
    }
    return output;
}
export function parseArticles(raw, max, publishers) {
    const data = parseJSON(raw), rows = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(rows)) throw new Error('公众号结果缺少 items 列表');
    return rows.slice(0, max).map(r => {
        const p = publishers.find(p => p.id === r.publisherId);
        if (!p) throw new Error('文章来自未订阅的公众号，未写入');
        if (!['title','summary','body'].every(k => typeof r[k] === 'string' && r[k].trim())) throw new Error('公众号文章缺少标题、摘要或正文');
        return { id: uid(), publisherId: p.id, author: p.name, title: r.title.trim(), summary: r.summary.trim(), body: r.body.trim(), createdAt: Date.now() };
    });
}
// Variables are local to this one request. No Tavern variables or source prompts are modified.
export function compileLocalMacros(messages, initial = {}) {
    const vars = { ...initial };
    const out = messages.map(m => ({ ...m, content: m.content.replace(/\{\{setvar::([\w.-]+)::((?:(?!\{\{|\}\})[\s\S])*)\}\}/gi, (_, k, v) => { vars[k] = v; return ''; }) }));
    for (const m of out) m.content = m.content.replace(/\{\{getvar::([\w.-]+)\}\}/gi, (raw, k) => Object.hasOwn(vars, k) ? vars[k] : raw);
    return { messages: out, vars };
}
export function chatProtocol(mode, conf, members, user, voice) {
    const base = `你在独立微信聊天中回复 ${user}。这是故事之外的元认知聊天空间，人格有自己的性格和口吻，话题不限剧情。只让所列成员发言，不代替真实用户在聊天里说话，不让未邀请的角色擅自进群。不要强制续写正文，不把关系亲近写成边界消失。每句短消息一个独立气泡。普通讨论和诊断可以长一些；诊断引用具体 Prompt 和实际文本，无法知道内部生成原因时说明是推测。当前剧情只是资料，依据最新楼层和历史，不把系统现实时间当作故事时间。原型的 status_app、GroupChat、News、Options 已由界面承载，不再输出状态栏标签、新闻全文或宏命令。`;
    const theatre = mode === 'theatre' ? '当前是小剧场模式：像闺蜜深夜线上聊天，活泼或疗愈。聊本轮正文好在哪里、有哪些槽点，再自然讨论后续。避免为了夸赞或吐槽而编造依据。日常短句尽量15字以内；遇逗号、句号等断句后分成独立消息，重复同一发言人的 contactId；保留 ! ? ~ ... 等语气。长分析可以正常展开。' : '';
    const choices = mode === 'choices' ? `当前是持续的选项模式。读取指定楼层和前文，继续听取用户意见，能反复讨论和修改候选，不因一次回复而退出。提出建议的人与执行行动的人分开：提出者为群内人格或虚构读者，执行者/成稿口吻是 ${voice}。生成下一步能直接放进酒馆输入框的台词或行动文字，不能只有“建议你……”的解释。每个候选单独一条 kind=option 消息，text 只放拟填入正文，reader 放提议者，optionType 放类别；说明和反问用 kind=text，不可把解释混成可注入内容。用户要求生成或修改候选时，按要求生成，默认 ${conf.count} 条；用户只是讨论可以不立即给候选。默认分类顺序：${JSON.stringify(conf.types)}。前六类读者昵称随本轮剧情和吐槽点新拟，不复用上一轮；最后两类由对应人格提出。若指定人格不在群内，改用实际成员，不冒名。所有选项遵守当下人物状态、关系边界和情境；不为凑类别强推亲密或跳跃剧情。普通来信建议可转成 ${voice} 的具体动作与台词，保持提出者的想法。附加要求：${conf.extra || '无'}。` : '';
    return `${base}\n${theatre}\n${choices}\n当用户想找公众号、想看某类世界内容，或话题自然适合推荐时，可推送虚构公众号名片 kind=publisher。根据世界和用户偏好拟名称、简介、关注主题、口吻；推荐不等于关注，不自动添加订阅。不每轮强推。不伪称真实联网媒体或真实公众号。已有订阅可以介绍，不重复造同名号。默认使用简体中文，港媒风格不等于繁体。\n最终只返回 JSON {"messages":[{"contactId":"成员ID","kind":"text|option|publisher","text":"消息或候选正文","reader":"仅候选需要","optionType":"仅候选需要","publisher":{"name":"仅公众号名片需要","intro":"简介","topics":"关注主题","style":"报道口吻","script":"simplified"}}]}。普通 text 消息不用附带其他字段。\n成员：${JSON.stringify(members.map(m => ({ contactId: m.id, name: m.name, bio: m.bio, origin: m.origin, sourceId: m.sourceId })))}`;
}
