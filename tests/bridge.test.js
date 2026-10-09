import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, Generator, sourceMessages } from '../bridge.js';
import { freshState } from '../core.js';
test('预设快照无连接密钥，开关不污染酒馆，名字含特殊替换符也保留', async () => {
    const p = { prompts: [{ identifier: 'p', role: 'system', content: '{{user}}与{{char}}' }], prompt_order: [{ character_id: 100001, order: [{ identifier: 'p', enabled: true }] }], proxy_password: 'secret', reverse_proxy: 'private' };
    globalThis.window = { SillyTavern: { getContext: () => ({ getPresetManager: () => ({ getPresetList: () => ({ preset_names: ['P'] }), getSelectedPresetName: () => 'P', getCompletionPresetByName: () => p }) }) } };
    const before = JSON.stringify(p), source = await snapshot('P'), state = freshState();
    assert.equal(JSON.stringify(source).includes('secret'), false);
    assert.equal(sourceMessages(state, source, '$&', '$1')[0].content, '$&与$1');
    state.settings.promptToggles[source.id] = { p: false }; assert.equal(sourceMessages(state, source, 'u', 'c').length, 0); assert.equal(JSON.stringify(p), before);
});
test('自定义接口补全地址、请求一次、失败保留错误、busy复原', async () => {
    const state = freshState(); Object.assign(state.settings, { apiMode: 'custom', customUrl: 'https://example.test/v1/', customKey: 'secret', customModel: 'model' });
    const gen = new Generator(() => state), original = globalThis.fetch; let count = 0;
    globalThis.fetch = async (url, options) => { count++; assert.equal(url, 'https://example.test/v1/chat/completions'); assert.equal(options.headers.Authorization, 'Bearer secret'); assert.equal(JSON.parse(options.body).stream, false); return Response.json({ choices: [{ message: { content: 'hello' } }] }); };
    try { assert.equal(await gen.call([{ role: 'user', content: 'Hi' }]), 'hello'); assert.equal(count, 1); assert.equal(gen.busy, false); globalThis.fetch = async () => new Response('', { status: 401 }); await assert.rejects(gen.call([]), /401/); assert.equal(gen.busy, false); }
    finally { globalThis.fetch = original; }
});
