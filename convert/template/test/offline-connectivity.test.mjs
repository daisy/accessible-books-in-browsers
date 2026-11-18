import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bookServerReachable } from '../src/js/offline-connectivity.js';

test('server reachability bypasses saved responses and notices a failed server independently of browser connectivity', async () => {
    const url = new URL('https://books.example/book/index.html');
    assert.equal(await bookServerReachable(url, async (actual, options) => {
        assert.equal(actual, url);
        assert.equal(options.cache, 'no-store');
        assert.equal(options.headers['X-Webbook-Offline-Network'], '1');
        assert.equal(options.method, 'HEAD');
        return new Response(null, { status: 200 });
    }), true);
    assert.equal(await bookServerReachable(url, async () => { throw new TypeError('Connection refused'); }), false);
    assert.equal(await bookServerReachable(url, async () => new Response(null, { status: 503 })), false);
});

test('servers without HEAD support can answer a GET probe', async () => {
    const methods = [];
    assert.equal(await bookServerReachable('https://books.example/book/index.html', async (_, options) => {
        methods.push(options.method);
        return new Response(null, { status: options.method === 'HEAD' ? 405 : 200 });
    }), true);
    assert.deepEqual(methods, ['HEAD', 'GET']);
});
