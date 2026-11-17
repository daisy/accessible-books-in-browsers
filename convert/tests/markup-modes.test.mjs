import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {applyWritingStyles,readPageStylesheets,specificity} from '../build/book-styles.js';
import {publisherStyles,scopeSelector} from '../build/publisher-styles.js';
import {ImageAssetRegistry} from '../build/assets.js';
import {transformContent} from '../build/content-transform.js';
import {ConversionReport} from '../build/conversion-report.js';

test('meaningful cascade: specificity, important, inline, inherited styles and explicit resets',()=>{
 const doc=new JSDOM('<div id="block"><span id="a" class="mark" style="font-weight: normal">A</span><span id="b" style="font-style:normal">B</span></div>').window.document;
 const report=new ConversionReport({declared:'en',effective:'en'},{});
 applyWritingStyles(doc,[{css:'div {font-style:italic} .mark {font-weight:700!important} #a {font-weight:400} span:first-child {text-decoration:underline line-through} span:hover {font-style:oblique} @media print {#b {font-weight:bold}} @media screen {#b {font-variant-caps:small-caps}}'}],{repaired:true,report,page:'p'});
 assert.ok(doc.querySelector('#block').classList.contains('webbook-style-italic'));
 assert.ok(doc.querySelector('#a').classList.contains('webbook-style-bold'));
 assert.ok(doc.querySelector('#a').classList.contains('webbook-style-underline'));
 assert.ok(doc.querySelector('#a').classList.contains('webbook-style-strike'));
 assert.ok(doc.querySelector('#b').classList.contains('webbook-style-not-italic'));
 assert.ok(doc.querySelector('#b').classList.contains('webbook-style-small-caps'));
 assert.ok(!doc.querySelector('#b').classList.contains('webbook-style-bold'));
 assert.equal(doc.body.textContent,'AB');
 assert.ok(report.data().changes.some(c=>c.kind.startsWith('Book styles kept as reader classes')));
});
test('boxes require multiple blocks or a heading; upper case and list styles are kept',()=>{
 const doc=new JSDOM('<div id="box"><h2>Heading</h2><p>Text</p></div><p id="p">Text</p><table><tr><td id="td"><p>A</p><p>B</p></td></tr></table><ol id="list"><li>A</li></ol><div id="zero"><h3>Zero</h3><p>No box</p></div>').window.document;
 applyWritingStyles(doc,[{css:'div,p,td {border:1px solid red;background:yellow} h2 {text-transform:uppercase} ol {list-style-type:upper-roman} #zero {border:0 solid red;background:transparent}'}],{repaired:true});
 assert.ok(doc.querySelector('#box').classList.contains('webbook-box'));
 assert.ok(!doc.querySelector('#p').classList.contains('webbook-box'));
 assert.ok(!doc.querySelector('#td').classList.contains('webbook-box'));
 assert.ok(doc.querySelector('h2').classList.contains('webbook-style-uppercase'));
 assert.ok(doc.querySelector('#list').classList.contains('webbook-style-list-upper-roman'));
 assert.ok(!doc.querySelector('#zero').classList.contains('webbook-box'));
});
test('original CSS is scoped, layered, normalized, and inline styles win inside its layer',async()=>{
 const doc=new JSDOM('<body class="chapter"><p style="font-style:italic!important">Text</p></body>').window.document;
 const css=await publisherStyles(doc,[{css:'html {writing-mode:vertical-rl;max-height:28em;color:red} body.chapter p {font-weight:bold!important} body + footer {display:none} .x {-epub-text-combine:horizontal}'}],new ImageAssetRegistry(),()=>{});
 assert.match(scopeSelector(':is(html, body) .x'), /^:is\(#webbook-main, #webbook-main\)/);
 assert.match(css,/@layer publisher/);assert.match(css,/@layer inline/);
 assert.doesNotMatch(css,/!important|writing-mode|max-height/);
 assert.match(css,/text-combine-upright: all/);
 assert.ok(!doc.querySelector('p').hasAttribute('style'));
 const shell=new JSDOM('<main id="webbook-main" class="chapter"><p>Text</p></main><footer>Controls</footer>').window.document;
 assert.match(scopeSelector('body + footer'), /:where\(#webbook-main, #webbook-main \*\):not\(:where\(\[data-webbook-reader\], \.webbook, \.webbook \*\)\)$/);
 assert.equal(shell.querySelector(scopeSelector('html body.chapter p').replace(/:where\(.*\)$/, '')).tagName,'P');
});
test('stylesheet imports keep source order, media and asset-relative URLs',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-css-'));
 try {
  await fs.mkdir(path.join(dir,'css'));await fs.writeFile(path.join(dir,'css','nested.css'),'.x {font-style:italic;background:url(bg.png)}');
  await fs.writeFile(path.join(dir,'css','main.css'),'@import "nested.css" screen; .x {font-weight:bold}');
  const doc=new JSDOM('<link rel="stylesheet" href="css/main.css"><p class="x">X</p>').window.document;
  const sheets=await readPageStylesheets(doc,path.join(dir,'page.xhtml'));
  applyWritingStyles(doc,sheets,{repaired:true});
  assert.ok(doc.querySelector('p').classList.contains('webbook-style-italic'));
  const registry=new ImageAssetRegistry();await publisherStyles(doc,sheets,registry,()=>{});
  assert.equal(registry.all()[0].sourcePath,path.join(dir,'css','bg.png'));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('both looks share repaired markup, language, text and warning analysis',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-original-'));
 try{
  const sourcePath=path.join(dir,'page.xhtml');
  await fs.writeFile(sourcePath,'<html><head><style>p{font-style:italic}</style></head><body class="chapter"><h1 title="Hidden"></h1><p id="phrase" xml:lang="fr">Bonjour</p><table><tr><td>A</td></tr></table></body></html>');
  const report=new ConversionReport({declared:'en',effective:'en'},{});
  const result=await transformContent({sourcePath,index:0,outputFilename:'p.html'},{metadata:{language:'en'},toc:[],pageList:[],idToOutput:new Map()},new ImageAssetRegistry(),undefined,['phrase'],[],false,{publisherStyles:true,cleanup:true,responsiveTables:true,reservedIds:new Set(),report});
  const doc=new JSDOM(result.bodyHtml).window.document;
  assert.equal(doc.querySelector('p').getAttribute('lang'),'fr');
  assert.equal(doc.querySelector('h1').textContent,'Hidden');assert.equal(doc.querySelector('h1').getAttribute('title'),null);
  assert.ok(doc.querySelector('.webbook-table-scroll'));assert.ok(doc.querySelector('a[rel="bookmark"]'));
  assert.equal(doc.body.textContent,'HiddenBonjourA');
  assert.match(result.publisherCss,/font-style: italic/);
  assert.ok(report.data().warnings.length>0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('CLI rejects removed markup modes and individual repair options',()=>{
 for(const option of ['--markup-cleanup','--no-markup-cleanup','--keep-all-ids','--split-chapters','--no-split-chapters','--responsive-tables','--no-responsive-tables','--markup=repaired','--markup=original']){
  const result=spawnSync(process.execPath,['build/index.js','convert','missing','out','template',option],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/unknown option|invalid/i);
 }
});

test('selector functions use their greatest argument and where contributes nothing',()=>{
 assert.equal(specificity(':is(.a, #id)'),specificity('#id'));
 assert.equal(specificity(':not(.a, .b)'),specificity('.a'));
 assert.equal(specificity(':where(#id) p'),specificity('p'));
 assert.equal(specificity(':is(:where(#id), .a)'),specificity('.a'));
});
test('EPUB semantic CSS selectors translate with their source attributes',async()=>{
 const doc=new JSDOM('<aside epub:type="footnote">Note</aside>').window.document;
 applyWritingStyles(doc,[{css:'aside[epub|type~="footnote"] {font-style:italic}'}],{repaired:true});
 assert.ok(doc.querySelector('aside').classList.contains('webbook-style-italic'));
 const output=await publisherStyles(doc,[{css:'aside[epub|type~="footnote"] {font-style:italic}'}],new ImageAssetRegistry(),()=>{});
 assert.match(output,/data-webbook-epub-type/);
 assert.doesNotMatch(output,/epub\|type/);
});

test('first-line indentation and block indentation retain distinct meanings',()=>{
 const doc=new JSDOM('<p id="first">First line</p><blockquote id="block">Block</blockquote>').window.document;
 applyWritingStyles(doc,[{css:'#first {text-indent:2em} #block {margin-left:2em;padding-left:1em}'}],{repaired:true});
 assert.ok(doc.querySelector('#first').classList.contains('webbook-style-text-indent-2'));
 assert.ok(!doc.querySelector('#first').classList.contains('webbook-style-indent-2'));
 assert.ok(doc.querySelector('#block').classList.contains('webbook-style-margin-left-2'));
 assert.ok(doc.querySelector('#block').classList.contains('webbook-style-padding-left-1'));
});

test('repaired SVG/MathML keep native styling and hidden content retains its meaning',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-vector-style-'));
 try{
  const sourcePath=path.join(dir,'page.xhtml');
  await fs.writeFile(sourcePath,`<html><head><style>.gone {display:none}.quiet{visibility:hidden}</style></head><body>
   <svg><style>.cls-1 {fill:#c00}</style><path class="cls-1" style="fill:none;stroke:#000" d="M0 0L1 1"/></svg>
   <math style="color:blue"><mi style="font-style:italic">x</mi></math>
   <p id="hidden" class="gone">Hidden</p><p id="quiet" class="quiet">Quiet</p><p id="inline" style="display:none">Inline hidden</p>
   <span id="css-only">CSS id</span></body></html>`);
  // A linked selector and a head style selector both protect otherwise ordinary ids.
  await fs.writeFile(path.join(dir,'book.css'),'#css-only {font-style:italic}');
  let source=await fs.readFile(sourcePath,'utf8');source=source.replace('<head>','<head><link rel="stylesheet" href="book.css"><style>#head-only{font-weight:bold}</style>');source=source.replace('</body>','<span id="head-only">Head id</span></body>');await fs.writeFile(sourcePath,source);
  const report=new ConversionReport({declared:'en',effective:'en'},{});
  const result=await transformContent({sourcePath,index:0,outputFilename:'p.html'},{metadata:{language:'en'},toc:[],pageList:[],idToOutput:new Map()},new ImageAssetRegistry(),undefined,['hidden','quiet','inline'],[],false,{publisherStyles:true,cleanup:true,responsiveTables:true,reservedIds:new Set(),report});
  const doc=new JSDOM(result.bodyHtml).window.document;
  assert.match(doc.querySelector('svg style').textContent,/fill:#c00/);
  assert.equal(doc.querySelector('path').getAttribute('style'),'fill:none;stroke:#000');
  assert.equal(doc.querySelector('math').getAttribute('style'),'color:blue');
  assert.equal(doc.querySelector('mi').getAttribute('style'),'font-style:italic');
  assert.ok(doc.querySelector('.gone').classList.contains('webbook-style-hidden'));
  assert.ok(doc.querySelector('.quiet').classList.contains('webbook-style-invisible'));
  assert.ok([...doc.querySelectorAll('p')].find(p=>p.textContent==='Inline hidden').classList.contains('webbook-style-hidden'));
  assert.ok(doc.getElementById('css-only'));assert.ok(doc.getElementById('head-only'));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('physical alignment and indents stay physical in RTL and vertical writing',()=>{
 for(const root of ['dir="rtl"','style="writing-mode:vertical-rl"']){
  const doc=new JSDOM(`<html ${root}><body><p id="physical">Text</p><p id="logical">Logical</p></body></html>`).window.document;
  applyWritingStyles(doc,[{css:'#physical {text-align:right;margin-left:2em;padding-left:1em} #logical {text-align:end;margin-inline-start:2em}'}],{repaired:true});
  const physical=doc.querySelector('#physical');assert.ok(physical.classList.contains('webbook-style-right'));
  assert.ok(!physical.classList.contains('webbook-style-end'));
  assert.ok(physical.classList.contains('webbook-style-margin-left-2'));
  assert.ok(physical.classList.contains('webbook-style-padding-left-1'));
  assert.ok(doc.querySelector('#logical').classList.contains('webbook-style-end'));
  assert.ok(doc.querySelector('#logical').classList.contains('webbook-style-indent-2'));
 }
});

test('original root ids resolve before scoping and frame filtering; asset names and nonstandard prefixes remain intact',async()=>{
 const doc=new JSDOM('<html id="root"><body id="ch1"><p id="p">Text</p></body></html>').window.document;
 const registry=new ImageAssetRegistry();
 const result=await publisherStyles(doc,[{sourcePath:'/books/style.css',css:'#ch1{margin:5em;width:90px;color:red} #root p {font-style:italic} #ch1 p{color:blue;background-image:url(images/fullwidth-banner.png);-webkit-line-clamp:3;-webkit-text-fill-color:red;-webkit-box-orient:vertical;text-transform:-epub-fullwidth}'}],registry,()=>{});
 assert.doesNotMatch(result,/#webbook-main\s+#webbook-main|margin:|width: 90px/);
 assert.match(result,/#webbook-main p/);assert.match(result,/font-style: italic/);
 assert.match(result,/-webkit-line-clamp: 3/);assert.match(result,/-webkit-text-fill-color: red/);assert.match(result,/-webkit-box-orient: vertical/);
 assert.match(result,/text-transform: full-width/);assert.match(result,/fullwidth-banner\.png/);
 assert.equal(registry.all()[0].sourcePath,'/books/images/fullwidth-banner.png');
});

test('original important declarations outrank normal inline and later rules below reader settings',async()=>{
 const doc=new JSDOM('<p class="note" style="color:blue;font-weight:400!important">Note</p>').window.document;
 const result=await publisherStyles(doc,[{css:'p.note{color:#600!important;font-weight:700!important} body p.note{color:green}'}],new ImageAssetRegistry(),()=>{});
 assert.match(result,/@layer source, inline, source-important, inline-important/);
 assert.match(result,/@layer source-important\s*\{[^}]*color: #600/s);
 assert.match(result,/@layer inline-important\s*\{[^}]*font-weight: 400/s);
 assert.doesNotMatch(result,/!important/);
});
