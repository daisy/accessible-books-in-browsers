import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {discoverBook,compareInventory,includeRemoteRelease} from '../src/js/offline-discovery.js';
const hash=text=>createHash('sha256').update(text).digest('hex');
const root='https://books.example/book/';
test('runtime inventory crawls notes, data, lazy UI, inactive publisher CSS/fonts and SVG styles without evaluating scripts',async()=>{
 const dom=new JSDOM('<html data-webbook-contract="0"></html>');
 const originals={fetch:globalThis.fetch,document:globalThis.document,DOMParser:globalThis.DOMParser};
 globalThis.document=dom.window.document;globalThis.DOMParser=dom.window.DOMParser;
 const ui=[{href:'src/css/style.css',body:'main{color:black}'},{href:'src/js/main.js',body:'throw new Error("Never evaluate discovery scripts");'},{href:'src/js/vendor/lazy.js',body:'export const lazy=1;'}];
 const files=ui.map(file=>({href:file.href,bytes:Buffer.byteLength(file.body),sha256:hash(file.body)}));
 const bodies=new Map(ui.map(file=>[file.href,file.body]));
 for(const [name,body] of Object.entries({
  'index.html':'<link rel="stylesheet" href="src/css/style.css"><script src="src/js/main.js"></script><a href="chapter.html#note">Chapter</a><a href="https://example.com/">External link</a>',
  'chapter.html':'<link rel="stylesheet" media="print" href="styles/publisher.css"><svg><style>path{fill:blue}</style></svg><a href="endnotes.html#note">Notes</a><audio src="audio/chapter.mp3"><track src="vtt/chapter.vtt"></audio><img srcset="images/a.png 1x, images/b.png 2x">',
  'endnotes.html':'<p id="note">A note.</p>',
  'styles/publisher.css':'@import "other.css"; @font-face{font-family:Book;src:url(../images/book.otf)}',
  'styles/other.css':'p{background:url(../images/bg.png)}',
  'search-data.json':JSON.stringify({version:1,pages:[{href:'chapter.html'}]}),
  'src/ui-files.json':JSON.stringify({version:1,contract:0,revision:hash(JSON.stringify(files)),files}),
  'sw.js':'importScripts("src/js/offline-worker.js");',
  'audio/chapter.mp3':'audio','vtt/chapter.vtt':'WEBVTT','images/a.png':'a','images/b.png':'b','images/book.otf':'font','images/bg.png':'image'
 }))bodies.set(name,body);
 const requests=[];
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.headers['X-Webbook-Offline-Network'],'1');assert.equal(options.cache,'no-store');
  const name=new URL(url).pathname.slice('/book/'.length);requests.push([name,options.method]);
  if(!bodies.has(name))return new Response('',{status:404});
  if(options.method==='HEAD'&&name==='images/book.otf')return new Response('',{status:405});
  const body=bodies.get(name);return new Response(options.method==='HEAD'?null:body,{headers:{'Content-Type':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html','ETag':'"'+hash(body)+'"','Content-Length':String(Buffer.byteLength(body))}});
 };
 try{
  const inventory=await discoverBook(root,{current:root+'chapter.html'});
  const names=inventory.files.map(file=>file.url.slice(root.length));
  for(const name of ['endnotes.html','src/js/vendor/lazy.js','styles/other.css','images/book.otf','images/bg.png','audio/chapter.mp3','vtt/chapter.vtt'])assert(names.includes(name),name);
  assert(!names.includes('audio-map.json'));assert.equal(inventory.sizeKnown,false);
  assert(!requests.some(([name,method])=>name==='audio/chapter.mp3'&&method==='GET'));
  const saved={files:inventory.files.map(file=>({...file}))};assert.deepEqual(compareInventory(saved,inventory),{changed:false,reliable:false});
  inventory.files.find(file=>file.url.endsWith('endnotes.html')).digest='new';assert.equal(compareInventory(saved,inventory).changed,true);
  const remoteFiles=['main.js','style.css','offline-worker.js'].map(href=>({href,bytes:1,sha256:'a'.repeat(64)}));
  const remote=includeRemoteRelease(inventory,root,{channel:'https://ui.example/v0/',version:'2026-11-16',inventory:{version:1,contract:0,files:remoteFiles}});
  assert.equal(remote.files.length,inventory.files.length+3);assert.equal(remote.ui.remote.version,'2026-11-16');
  assert.throws(()=>includeRemoteRelease(inventory,root,{channel:'https://ui.example/v0/',version:'2026-11-16',inventory:{version:1,contract:0,files:[...remoteFiles,{href:'../../../escape.js',bytes:1,sha256:'a'.repeat(64)}]}}));
 }finally{Object.assign(globalThis,originals);dom.window.close();}
});
