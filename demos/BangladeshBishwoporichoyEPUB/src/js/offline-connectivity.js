// Bypass both the HTTP cache and the saved snapshot: connectivity means the
// publication server answered, rather than the browser having a network link.
export async function bookServerReachable(url, fetcher = fetch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const options = { cache: 'no-store', headers: { 'X-Webbook-Offline-Network': '1' }, signal: controller.signal };
    try {
        let response = await fetcher(url, { ...options, method: 'HEAD' });
        if ([405, 501].includes(response.status)) {
            response = await fetcher(url, { ...options, method: 'GET' });
            await response.body?.cancel();
        }
        return response.ok;
    } catch { return false; }
    finally { clearTimeout(timer); }
}
