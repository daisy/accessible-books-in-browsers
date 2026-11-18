// Classic script, shared with the worker's release bundle and independently tested.
self.WebbookOfflineRange = async function(request, response) {
    const blob = await response.blob(), length = blob.size, headers = new Headers(response.headers);
    for (const name of ['Content-Encoding', 'Transfer-Encoding', 'Content-Range', 'Content-Length']) headers.delete(name);
    headers.set('Accept-Ranges', 'bytes'); headers.set('Content-Length', String(length));
    const full = () => new Response(request.method === 'HEAD' ? null : blob, { status: 200, headers });
    if (request.method === 'HEAD') return full();
    const range = request.headers.get('Range'), condition = request.headers.get('If-Range');
    if (!range || condition && (condition.startsWith('W/') || condition !== headers.get('ETag') && condition !== headers.get('Last-Modified'))) return full();
    if (range.includes(',')) return full();
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || !match[1] && !match[2]) return full();
    let start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
    let end = match[1] ? match[2] ? Number(match[2]) : length - 1 : length - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !length || start >= length || end < start || !match[1] && Number(match[2]) === 0) {
        headers.set('Content-Range', `bytes */${length}`); headers.set('Content-Length', '0');
        return new Response(null, { status: 416, headers });
    }
    end = Math.min(end, length - 1);
    headers.set('Content-Range', `bytes ${start}-${end}/${length}`); headers.set('Content-Length', String(end - start + 1));
    return new Response(blob.slice(start, end + 1), { status: 206, headers });
};
