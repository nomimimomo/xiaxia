import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../storage.js';
import { freshState } from '../core.js';
test('账户文件持久化、回读确认、保存冲突与失败保护', async () => {
    const original = globalThis.fetch; let remote = null, fail = false, uploads = 0;
    globalThis.fetch = async (path, options) => {
        if (path === '/api/files/upload') { if (fail) return new Response('', { status: 500 }); remote = JSON.parse(Buffer.from(JSON.parse(options.body).data, 'base64').toString()); uploads++; return Response.json({ path: 'user/files/ame-shrimp-v1.json' }); }
        return remote ? Response.json(remote) : new Response('', { status: 404 });
    };
    const statuses = [], context = () => ({ getRequestHeaders: () => ({ 'Content-Type': 'application/json' }) });
    try {
        const a = new Store(context, (s, e) => statuses.push({ s, e })); await a.load(); a.state.contacts.push({ id: 'c', name: 'Ako' }); await a.save(); assert.equal(remote.data.contacts[0].name, 'Ako'); assert.equal(statuses.at(-1).s, '已保存到酒馆');
        const b = new Store(context, () => {}); await b.load(); a.state.contacts[0].name = 'A'; await a.save(); const count = uploads; b.state.contacts[0].name = 'B'; await assert.rejects(b.save(), /其他页面/); assert.equal(uploads, count); assert.equal(b.state.contacts[0].name, 'B');
        fail = true; a.state.settings.customModel = 'test'; await assert.rejects(a.save(), /保存失败/); assert.equal(a.state.settings.customModel, 'test'); fail = false; await a.save(); assert.equal(remote.data.settings.customModel, 'test');
        remote = { revision: 'broken', data: {} }; const bad = new Store(context, () => {}); await assert.rejects(bad.load()); assert.equal(bad.state, null); assert.notEqual(uploads, 0);
    } finally { globalThis.fetch = original; }
});
