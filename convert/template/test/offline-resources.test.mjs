import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {resourceURL, cssReferences, srcsetReferences, workerScriptURL} from '../src/js/offline-resources.js';
const root='https://books.example/library/book/';
test('offline URLs stay under the exact book root and canonicalize page fragments/queries',()=>{
 assert.equal(resourceURL('../images/a.png','https://books.example/library/book/styles/x.css',root),root+'images/a.png');
 assert.equal(resourceURL('chapter.html?q=test#x',root,root),root+'chapter.html');
 assert.equal(resourceURL('#a',root,root),null);assert.equal(resourceURL('data:image/png,a',root,root),null);
 for(const href of ['../other/index.html','https://elsewhere.example/image.png','%2e%2e/other.png','images/%2f..%2f..%2fother.png','images/%5cother.png'])assert.throws(()=>resourceURL(href,root,root),undefined,href);
 assert.equal(resourceURL('https://elsewhere.example/',root,root,{link:true}),null);
});
test('CSS resources include imports and escaped URLs but ignore comments and content strings',()=>{
 assert.deepEqual(cssReferences('/*url(fake)*/ @import "a.css" print; @import url(b.css); .a{background:URL("im\\61 ge.png");content:"url(nope)";mask:url(data:image/svg+xml,a);src:url(font\\).otf)}'),['a.css','b.css','image.png','data:image/svg+xml,a','font).otf']);
});
test('CSS image-set string candidates and extensionless imports are discoverable',()=>{
 const imports=[];
 assert.deepEqual(cssReferences('@import url(theme);p{background:image-set("a.png" 1x type("image/png"), url(b.png) 2x)}',url=>imports.push(url)),['theme','a.png','b.png']);
 assert.deepEqual(imports,['theme']);
});
test('srcset parsing retains data URL commas and separates width/density candidates',()=>{
 assert.deepEqual(srcsetReferences('a.png 1x, b.png 2x'),['a.png','b.png']);
 assert.deepEqual(srcsetReferences('data:image/png;base64,AAAA 1x, b.png 2x'),['data:image/png;base64,AAAA','b.png']);
 assert.deepEqual(srcsetReferences('a.png, b.png 800w'),['a.png','b.png']);
});
test('remote worker updates retain the root stub and reject an arbitrary worker URL',()=>{
 assert.equal(workerScriptURL(root),root+'sw.js');
 const url=new URL(workerScriptURL(root,{channel:'https://ui.example/v0/',worker:'releases/2026-11-16/offline-worker.js'}));
 assert.equal(url.pathname,'/library/book/sw.js');assert.equal(url.searchParams.get('webbook-worker'),'https://ui.example/v0/releases/2026-11-16/offline-worker.js');
 for(const remote of [{channel:'http://ui.example/v0/',worker:'releases/a/offline-worker.js'},{channel:'https://ui.example/v0/',worker:'https://bad.example/offline-worker.js'},{channel:'https://ui.example/v0/',worker:'../worker.js'}])assert.throws(()=>workerScriptURL(root,remote));
});
const worker={};vm.runInNewContext(readFileSync(new URL('../src/js/offline-range.js',import.meta.url),'utf8'),{self:worker,Blob,Headers,Response});
const full=()=>new Response('abcdefghij',{headers:{'Content-Type':'audio/mpeg','Content-Length':'999','Content-Encoding':'gzip','ETag':'"version"'}});
const slice=(range,extra={})=>worker.WebbookOfflineRange(new Request(root+'audio/a.mp3',{headers:{Range:range,...extra}}),full());
test('cached audio handles closed, open, suffix, clamped, unsatisfiable and multiple byte ranges',async()=>{
 for(const [range,text,content] of [['bytes=2-4','cde','bytes 2-4/10'],['bytes=7-','hij','bytes 7-9/10'],['bytes=-3','hij','bytes 7-9/10'],['bytes=8-100','ij','bytes 8-9/10']]){
  const response=await slice(range);assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),content);assert.equal(response.headers.get('Content-Length'),String(text.length));assert.equal(response.headers.has('Content-Encoding'),false);assert.equal(await response.text(),text);
 }
 for(const range of ['bytes=10-','bytes=8-3','bytes=-0']){const response=await slice(range);assert.equal(response.status,416);assert.equal(response.headers.get('Content-Range'),'bytes */10');}
 for(const range of ['bytes=0-1,4-5','invalid']){const response=await slice(range);assert.equal(response.status,200);assert.equal(await response.text(),'abcdefghij');}
});
test('cached audio honors If-Range, HEAD and empty resources',async()=>{
 assert.equal((await slice('bytes=1-2',{'If-Range':'"other"'})).status,200);
 assert.equal((await slice('bytes=1-2',{'If-Range':'"version"'})).status,206);
 const head=await worker.WebbookOfflineRange(new Request(root+'audio/a.mp3',{method:'HEAD'}),full());assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),'10');assert.equal(await head.text(),'');
 assert.equal((await worker.WebbookOfflineRange(new Request(root+'audio/a.mp3',{headers:{Range:'bytes=0-'}}),new Response(''))).status,416);
});

test('foreground GET and HEAD bypass saved local audio without adding CORS preflight headers to remote releases',async()=>{
 const target={},requests=[];
 vm.runInNewContext(readFileSync(new URL('../src/js/offline-network.js',import.meta.url),'utf8'),{self:target,URL,AbortController,AbortSignal,setTimeout,clearTimeout,fetch:async(url,options)=>{requests.push({url,options});return new Response('fresh');}});
 for(const method of ['GET','HEAD'])await target.WebbookOfflineFetch(root+'audio/chapter.mp3',{scope:root,foreground:true,method});
 await target.WebbookOfflineFetch('https://ui.example/v0/releases/A/main.js',{scope:root,foreground:true});
 await target.WebbookOfflineFetch(root+'audio/chapter.mp3',{scope:root,foreground:false});
 assert.equal(requests[0].options.headers['X-Webbook-Offline-Network'],'1');assert.equal(requests[1].options.headers['X-Webbook-Offline-Network'],'1');assert.equal(requests[1].options.method,'HEAD');
 assert.equal(requests[2].options.headers,undefined);assert.equal(requests[2].options.credentials,'omit');assert.equal(requests[3].options.headers,undefined);
 assert(requests.every(request=>request.options.cache==='no-store'&&request.options.redirect==='error'));
});
