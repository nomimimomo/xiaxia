import { clone, uid, parseJSON, digest } from './core.js?v=1.3.0';
export const defaultPublisher = () => ({ id: 'builtin-hk', name: '街巷来信', intro: '用港媒笔触看故事里的世情与人物。', topics: '当地社会、民生、娱乐、人物传闻、街头见闻', style: '香港本地报刊口吻；标题简洁醒目，记者报道笔触，娱乐话题可有圈内消息、传闻及人物反应。措辞贴合故事所处年代。只借鉴口吻，不把其他世界强行设在香港。', script: 'simplified', followed: true, scope: '*', createdAt: Date.now() });
export const defaultFeatures = () => ({ readStory:true });
export function upgradeFeatures(state) {
    if (!Array.isArray(state.publishers)) state.publishers=[defaultPublisher()];
    // Old mode controls no longer affect requests; preserve messages and original preset snapshots.
    for(const c of state.conversations)c.features=defaultFeatures();
    return state;
}
export function features(c){return c.features ||= defaultFeatures();}
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
export function parseChatResponse(raw, members, mode, scope, contextRef, maxOptions = 100) {
    const data = parseJSON(raw), rows = Array.isArray(data) ? data : data.messages;
    if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new Error('回复缺少有效消息列表');
    const allowed = new Set(members), output = []; let count = 0;
    for (const r of rows) {
        if (!allowed.has(r.contactId)) throw new Error('回复包含非本会话成员，未写入');
        const kind = r.kind || 'text';
        if (!['text', 'option', 'publisher', 'style'].includes(kind)) throw new Error('消息类型无法识别');
        if (typeof r.text !== 'string' || (!r.text.trim() && kind !== 'publisher')) throw new Error('回复包含空消息');
        const m = { id: uid(), side: 'ai', contactId: r.contactId, text: r.text.trim(), kind, createdAt: Date.now() };
        if (kind === 'option') {
            if (!contextRef) throw new Error('缺少正文来源，选项未写入');
            if (++count > maxOptions) continue;
            m.insertText = typeof r.insertText === 'string' && r.insertText.trim() ? r.insertText.trim() : m.text; m.contextRef = clone(contextRef);
        }
        if (kind === 'style') { if(typeof r.styleId!=='string')throw Error('文风消息缺少来源');m.styleId=r.styleId; }
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
export function chatProtocol(mode, conf, members, user) {
 return `你在独立微信聊天中回复 ${user}。这是故事之外的元认知聊天空间，每位成员始终用自己的身份、性格和口吻与用户交谈。只让所列成员发言，不代替用户，不冒充虚构读者或未邀请的人。正文、角色设定、世界资料和启用预设会在后台一并提供。以最新剧情为依据，话题可自由展开。每条消息一个气泡，保持自然说话的节奏；不要把一段分析拆成零碎单字。不要重复状态栏包装标签。
用户让你生成选项、给出下一步建议或修改候选时，直接调用已经提供的预设中对应功能与要求，不额外进入任何模式，不自行指定固定数量或类别。预设的 choice 局部变量也会随资料提供。每个建议用正在聊天的成员本人口吻说出来，kind=option、text 为对用户说的话。若附带可直接填入酒馆输入框的行动或台词，另放 insertText；不要把提议者换成用户角色。讨论继续用 text 即可。
需要推荐文风时，只能从 fishboardStyleLibrary 的真实条目选择，以 kind=style 和准确 styleId 发出文件消息，text 可写推荐理由；禁止编造库里不存在的文风。
想推荐故事内的公众号时可返回 kind=publisher 名片，用户点击关注后才订阅，不每轮强推。默认简体中文，港媒口吻不等于繁体。
最终只返回 JSON {"messages":[{"contactId":"成员ID","kind":"text|option|publisher|style","text":"成员本人的消息","insertText":"选项可选的拟填入内容","styleId":"仅文风文件使用真实库ID","publisher":{"name":"仅公众号名片使用","intro":"简介","topics":"主题","style":"口吻","script":"simplified"}}]}。不使用的字段省略。
成员：${JSON.stringify(members.map(m=>({contactId:m.id,name:m.name,bio:m.bio,origin:m.origin,sourceId:m.sourceId})))}`;
}
