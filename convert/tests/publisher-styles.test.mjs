import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PublisherSelectors,selectorSpecificity,specificityPadding,pseudoElement,SOURCE_ID} from '../build/publisher-selectors.js';
import {transformContent} from '../build/content-transform.js';
import {ImageAssetRegistry,copyImageAssets} from '../build/assets.js';
import {ConversionReport} from '../build/conversion-report.js';
import {IDPF_FONT,ADOBE_FONT,fontKey} from '../build/font-obfuscation.js';
import {readPageStylesheets} from '../build/book-styles.js';
const report=()=>new ConversionReport({declared:'en',effective:'en'},{});
function selectorCase(html,css){const doc=new JSDOM(html).window.document;return{doc,plan:new PublisherSelectors(doc,[{css}])};}
test('frozen selectors keep exact specificity, pseudo-elements and interactive ancestor state',()=>{
 const {doc,plan}=selectorCase('<div><table><tr><td>A</td></tr></table></div>', 'div:hover > table::before{content:"table"}');
 const table=doc.querySelector('table'),wrapper=doc.createElement('section');table.before(wrapper);wrapper.append(table);
 plan.checkpoint('table wrapper');const counts=plan.finish();const frozen=plan.selector(0,'div:hover > table::before');
 assert.equal(counts.frozen,1);assert.equal(counts.causes['table wrapper'],1);assert.match(frozen.selector,/:hover/);assert.match(frozen.selector,/::before$/);
 assert.ok(table.className.startsWith('webbook-publisher-r'));assert.match(doc.querySelector('div').className,/webbook-publisher-s/);
 const weight=selectorSpecificity('div:hover > table::before');assert.deepEqual(weight,[0,1,3]);
 const {base,pseudo}=pseudoElement(frozen.selector);const pseudoWeight=selectorSpecificity(pseudo);
 assert.deepEqual(selectorSpecificity(`:where(${base})${specificityPadding([weight[0],weight[1],weight[2]-pseudoWeight[2]])}${pseudo}`),weight);
 assert.equal(doc.querySelector(`[${SOURCE_ID}]`),null);
});
test('unchanged and originally unmatched selectors stay written; removed matched elements are reported',()=>{
 const {doc,plan}=selectorCase('<p>One<span>word</span></p>','p{color:red}.absent{color:blue}span{color:green}');
 doc.querySelector('span').replaceWith('word');plan.checkpoint('cleanup');const counts=plan.finish();
 assert.equal(plan.selector(0,'p').selector,'p');assert.equal(plan.selector(0,'.absent').selector,'.absent');
 assert.equal(counts.kept,2);assert.equal(counts.unapplied,1);assert.match(counts.examples[0],/span/);
});
async function converted(html,extra={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-publisher-test-'));
 const sourcePath=path.join(dir,'page.xhtml');await fs.writeFile(sourcePath,html);
 const r=report();const page={sourcePath,index:0,outputFilename:'page.html',...extra.page};
 try{
  const content=await transformContent(page,{metadata:{language:'en'},toc:[],pageList:[],idToOutput:new Map()},new ImageAssetRegistry(),undefined,[],[],false,{cleanup:true,responsiveTables:true,reservedIds:new Set(),report:r,...extra.options});
  return{content,doc:new JSDOM(content.bodyHtml).window.document,report:r};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
test('freezing preserves a source drop cap on the right paragraph after chapter splitting',async()=>{
 const html='<head><style>p:first-of-type::first-letter {font-size:3em} p{color:blue}</style></head><body><h2 id="one">One</h2><p>First</p><h2 id="two">Two</h2><p>Second</p></body>';
 const split={cutIds:['one','two'],cutTitles:['One','Two'],depth:2,leading:false,pieces:2,piece:1};
 const {content,doc,report:r}=await converted(html,{page:{split}});
 assert.equal(doc.querySelector('p').textContent,'Second');
 assert.match(content.publisherCss,/webbook-publisher-r/);assert.match(content.publisherCss,/::first-letter/);
 assert.ok(!Array.from(doc.querySelector('p').classList).some(c=>/^webbook-publisher-r/.test(c)),'the second paragraph never acquires the first source paragraph’s drop cap');
 assert.equal(r.data().publisherStyles.totals.causes.splitting,1);
 assert.equal(r.data().publisherStyles.totals.unapplied,0,'a paragraph on the other page was not removed from the book');
});
test('table wrappers and heading permalinks freeze affected rules; styled empty paragraphs are design-only',async()=>{
 const {content,doc,report:r}=await converted('<head><style>div.holder > table{border:1px solid} div > table{color:blue} h2 > span:last-child{color:red} h2 > span:first-child{font-style:italic} p.blank{height:3em}</style></head><body><h2><span>Heading</span></h2><div class="holder"><table><tr><td>A</td></tr></table></div><p class="blank"></p><p></p></body>');
 assert.ok(doc.querySelector('table').className.includes('webbook-publisher-r'));
 assert.ok(doc.querySelector('h2 span').className.includes('webbook-publisher-r'));
 assert.ok(doc.querySelector('p.blank.webbook-publisher-only'));assert.equal(doc.querySelectorAll('p').length,1);
 assert.equal(doc.querySelector(`[${SOURCE_ID}]`),null);
 assert.ok(r.data().publisherStyles.totals.causes['table wrapper']>=1);
 assert.ok(r.data().publisherStyles.totals.causes.permalink>=1);
 assert.match(content.publisherCss,/h2 > span:first-child/);
});
test('inline styles belong to the design only, and no-publisher-styles removes them without a design stylesheet',async()=>{
 const html='<body><p style="font-weight:bold;color:red">Text</p><p style="height:2em"></p><svg style="fill:red"><style>path{stroke:black}</style></svg></body>';
 const normal=await converted(html);
 assert.equal(normal.doc.querySelector('p').hasAttribute('style'),false);
 assert.ok(normal.doc.querySelector('p').classList.contains('webbook-style-bold'));
 assert.match(normal.content.publisherCss,/@layer inline/);assert.match(normal.content.publisherCss,/color: red/);
 assert.ok(normal.doc.querySelector('.webbook-publisher-only'));
 assert.equal(normal.doc.querySelector('svg').getAttribute('style'),'fill:red');
 const omitted=await converted(html,{options:{publisherStyles:false}});
 assert.equal(omitted.content.publisherCss,undefined);assert.equal(omitted.doc.querySelector('p').hasAttribute('style'),false);
 assert.equal(omitted.doc.querySelectorAll('p').length,1);
});
test('only preferred stylesheets are read; alternates do not change the book writing mode',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-preferred-'));
 try{
  await fs.writeFile(path.join(dir,'vertical.css'),'body{writing-mode:vertical-rl}');await fs.writeFile(path.join(dir,'horizontal.css'),'body{writing-mode:horizontal-tb}');
  const doc=new JSDOM('<link rel="stylesheet" href="vertical.css"><link rel="alternate stylesheet" class="horizontal" href="horizontal.css">').window.document;
  const sheets=await readPageStylesheets(doc,path.join(dir,'chapter.xhtml'));assert.equal(sheets.length,1);assert.match(sheets[0].css,/vertical-rl/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('IDPF and Adobe fonts are de-obfuscated on copy; unsupported encryption is omitted and reported',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-fonts-'));
 try{
  await fs.mkdir(path.join(dir,'META-INF'));await fs.mkdir(path.join(dir,'OEBPS'));
  const uuid='urn:uuid:12345678-9abc-def0-1234-56789abcdef0',identifier=' book\nidentifier\t';
  await fs.writeFile(path.join(dir,'OEBPS','content.opf'),`<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub">${identifier}</dc:identifier><dc:identifier>${uuid}</dc:identifier></metadata></package>`);
  const raw=Buffer.from(Array.from({length:1200},(_,i)=>i%251));
  const idpfKey=createHash('sha1').update('bookidentifier').digest(),adobeKey=Buffer.from('123456789abcdef0123456789abcdef0','hex');
  const specs=[['idpf.otf',IDPF_FONT,idpfKey,1040],['adobe.otf',ADOBE_FONT,adobeKey,1024],['locked.otf','https://unsupported.example/encryption',Buffer.from([1]),100]];
  for(const [name,,key,length] of specs){const input=Buffer.from(raw);for(let i=0;i<length;i++)input[i]^=key[i%key.length];await fs.writeFile(path.join(dir,'OEBPS',name),input);}
  await fs.writeFile(path.join(dir,'META-INF','encryption.xml'),`<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:e="http://www.w3.org/2001/04/xmlenc#">${specs.map(([name,algorithm])=>`<e:EncryptedData><e:EncryptionMethod Algorithm="${algorithm}"/><e:CipherData><e:CipherReference URI="OEBPS/${name}"/></e:CipherData></e:EncryptedData>`).join('')}</encryption>`);
  const registry=new ImageAssetRegistry(),r=report();r.publisherRules('page.html',{kept:0,frozen:0,unapplied:0,causes:{},examples:[]});await registry.configureFonts(dir,path.join(dir,'OEBPS','content.opf'),r);
  for(const [name,algorithm] of specs){const asset=registry.registerPublisherAsset(path.join(dir,'OEBPS',name),'page.html',true);if(algorithm.startsWith('https'))assert.equal(asset,null);else assert.ok(asset);}
  const imagesDir=path.join(dir,'output');await fs.mkdir(imagesDir);await copyImageAssets(registry,{imagesDir});
  for(const name of ['idpf.otf','adobe.otf'])assert.deepEqual(await fs.readFile(path.join(imagesDir,name)),raw);
  assert.equal(r.data().publisherStyles.totals.fonts.count,2);assert.equal(r.data().publisherStyles.totals.fonts.bytes,2400);
  assert.ok(r.data().warnings.some(w=>w.message.includes('locked.otf')));
  assert.deepEqual(fontKey(identifier,IDPF_FONT),idpfKey);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('source-root anchors cannot invalidate narration paths or first-child publisher selectors',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-root-cue-'));
 try{
  const sourcePath=path.join(dir,'page.xhtml');await fs.writeFile(sourcePath,'<head><style>#root{color:blue} body > p:first-child{font-size:2em}</style></head><body id="root"><p id="phrase">A phrase.</p></body>');
  const r=report();const result=await transformContent({sourcePath,index:0,outputFilename:'page.html'},{metadata:{language:'en'},toc:[],pageList:[],idToOutput:new Map()},new ImageAssetRegistry(),undefined,['phrase'],[],false,{cleanup:true,responsiveTables:true,reservedIds:new Set(),report:r});
  const attrs=result.bodyAttributes.filter(a=>a.name!=='id').map(a=>`${a.name}="${a.value}"`).join(' ');
  const rendered=new JSDOM(`<main id="webbook-main" ${attrs}>${result.bodyHtml}</main>`).window.document;
  const {resolveNarrationSelector}=await import('../build/structure-ids.js');
  assert.equal(resolveNarrationSelector(rendered,result.narrationSelectors.get('phrase')).textContent,'A phrase.');
  assert.ok(rendered.querySelector('main > p').className.includes('webbook-publisher-r'));
  assert.ok(rendered.getElementById('root'));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('linked-sheet media conditions also enclose imported rules',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-media-import-'));
 try{
  await fs.writeFile(path.join(dir,'main.css'),'@import "nested.css" screen; p{font-weight:bold}');await fs.writeFile(path.join(dir,'nested.css'),'p{font-style:italic}');
  const doc=new JSDOM('<link rel="stylesheet" media="print" href="main.css"><p>Text</p>').window.document;
  const sheets=await readPageStylesheets(doc,path.join(dir,'page.xhtml'));
  assert.match(sheets[0].css,/@media print\s*\{@media screen/);
  const {applyWritingStyles}=await import('../build/book-styles.js');applyWritingStyles(doc,sheets,{repaired:true});
  assert.ok(!doc.querySelector('p').className.includes('italic'));assert.ok(!doc.querySelector('p').className.includes('bold'));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('broad rules ignore inserted reader elements while changes to source matches still freeze',()=>{
 const {doc,plan}=selectorCase('<h2>Heading</h2><p>Body</p>','* { color: red } button, a, svg { color: pink } .later { font-style:italic }');
 const link=doc.createElement('a');link.className='webbook';doc.querySelector('h2').prepend(link);
 plan.checkpoint('permalink');
 const counts=plan.finish();assert.equal(counts.frozen,0);assert.equal(counts.kept,5);
 assert.equal(doc.querySelectorAll('[class*="webbook-publisher-r"]').length,0);
 assert.equal(link.hasAttribute('data-webbook-reader'),true);
 const third=selectorCase('<p class="later">First</p><p>Second</p>','.later { color:red }');
 third.doc.querySelectorAll('p')[1].classList.add('later');assert.equal(third.plan.finish().frozen,1);
 assert.equal(third.doc.querySelectorAll('.webbook-publisher-r1').length,1);
});
