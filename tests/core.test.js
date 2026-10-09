import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, orderedPrompts, digest, parseReply, parseFeed, applyTurn, mergeFeed, sourceStale, migrateLegacy, validateState } from '../core.js';

test('顺序表为准，关闭条目不被关键词启用，未链接不执行；原预设不变', () => {
    const preset = { prompts: [{ identifier: 'a', name: 'writing conversation', content: 'x' }, { identifier: 'b', content: 'unlinked' }, { identifier: 'marker', marker: true }], prompt_order: [{ character_id: 100001, order: [{ identifier: 'a', enabled: false }, { identifier: 'marker', enabled: true }] }] };
    const before = JSON.stringify(preset), rows = orderedPrompts(preset);
    assert.equal(rows[0].enabled, false); assert.equal(rows[1].enabled, false); assert.equal(rows[2].linked, false);
    assert.equal(orderedPrompts(preset, { a: true, b: true })[0].enabled, true);
    assert.equal(orderedPrompts(preset, { b: true })[2].enabled, false); assert.equal(JSON.stringify(preset), before);
});
test('同名不同预设及不同版本拥有不同来源身份', async () => {
    assert.notEqual(await digest({ name: 'Ako A', text: 'x' }), await digest({ name: 'Ako B', text: 'x' }));
    assert.notEqual(await digest({ name: 'Ako A', text: 'x' }), await digest({ name: 'Ako A', text: 'y' }));
});
test('不接受非成员回复，消息不强行合并', () => {
    assert.throws(() => parseReply('{"messages":[{"contactId":"other","text":"x"}]}', ['a']));
    assert.equal(parseReply('{"messages":[{"contactId":"a","text":"一"},{"contactId":"a","text":"二"}]}', ['a']).length, 2);
});
test('新回复验证成功才替换原回复；批次归属隔离', () => {
    const c = { messages: [{ id: 'u', side: 'user', text: 'hi', status: 'pending' }], turns: [] };
    applyTurn(c, [{ id: 'a1', side: 'ai', text: 'old' }], ['u']);
    const before = JSON.stringify(c); assert.throws(() => parseReply('bad', ['p'])); assert.equal(JSON.stringify(c), before);
    applyTurn(c, [{ id: 'a2', side: 'ai', text: 'new' }], ['u'], c.turns[0]);
    assert.equal(c.messages.length, 2); assert.equal(c.messages[1].text, 'new'); assert.equal(c.turns.length, 1); assert.equal(c.messages[0].status, 'sent');
});
test('信息流去重、上限、空结果进度与正文变化标记', () => {
    const b = { items: [] }, rows = [{ author: 'a', title: 't', body: 'x' }, { author: 'a', title: 't', body: 'x' }, { author: 'b', title: 't2', body: 'y' }];
    mergeFeed(b, rows, 'v1', [{ index: 2, hash: 'x' }], 1); assert.equal(b.items.length, 1); assert.equal(b.items[0].author, 'b');
    mergeFeed(b, [], 'v2', [], 1); assert.equal(b.items.length, 1); assert.equal(b.lastSignature, 'v2');
    assert.equal(sourceStale(b.items[0], [{ index: 2, hash: 'x' }]), false); assert.equal(sourceStale(b.items[0], []), true);
    assert.deepEqual(parseFeed('{"items":[]}', 3), []);
});
test('旧版迁移不猜成员，不删除原始对象，失败及名片保留', () => {
    const old = { settings: { presetPersonas: { P: ['Ako'] } }, sessions: [{ title: '旧聊天', messages: [{ type: 'text', side: 'user', text: 'hello', status: 'failed' }, { type: 'card', card: { name: 'C' } }] }] };
    const before = JSON.stringify(old), s = migrateLegacy(old); assert.equal(s.contacts[0].name, 'Ako'); assert.deepEqual(s.conversations[0].members, []); assert.equal(s.conversations[0].messages[0].status, 'pending'); assert.match(s.conversations[0].messages[1].text, /C/); assert.equal(JSON.stringify(old), before); validateState(s);
});
test('不同故事和模块独立清理；不自动开启 API 调用', () => {
    const s = freshState(); assert.equal(s.settings.feeds.news.auto, false); assert.equal(s.settings.feeds.moments.withChat, false);
    const b1 = { items: [] }, b2 = { items: [{ body: '保留' }] }; mergeFeed(b1, [], 'a', [], 1); assert.equal(b2.items.length, 1);
});
