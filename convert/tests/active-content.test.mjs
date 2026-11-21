import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';

const cli=fileURLToPath(new URL('../build/index.js',import.meta.url)),template=fileURLToPath(new URL('../template',import.meta.url));
const chapter=`<html xmlns="http://www.w3.org/1999/xhtml" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><head><title>Test</title><script>window.headRan=1</script></head>
<body onload="window.bodyRan=1"><h1>Test</h1>
<script>window.inlineRan=1</script><script src="evil.js"></script>
<p onclick="window.clicked=1" onMouseOver="x()">Words stay.</p>
<p><img src="picture.svg" alt="A picture"/></p>
<p><a href="javascript:alert(1)">A script link</a>, <a href=" JaVa&#x09;Script:alert(1)">a disguised one</a> and <a href="chapter.xhtml#top">a real one</a>.</p>
<form action="javascript:alert(1)"><button formaction="javascript:alert(2)" type="button">Go</button></form>
<iframe srcdoc="&lt;script&gt;parent.x=1&lt;/script&gt;" title="frame"></iframe>
<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shape"><title>Shape</title><script>window.svgRan=1</script>
<a xlink:href="javascript:alert(3)"><circle r="5" onclick="x()"/><animate attributeName="href" to="javascript:alert(4)"/><set attributeName="xlink:href" to="javascript:alert(5)"/><animate attributeName="r" from="5" to="6"/></a></svg>
</body></html>`;

test('the book\'s scripts, event handlers and script links are removed and reported; its words and the reader\'s own scripts stay',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-active-'));
 try{
  const source=path.join(dir,'book');await fs.mkdir(path.join(source,'META-INF'),{recursive:true});
  await fs.writeFile(path.join(source,'META-INF/container.xml'),'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  await fs.writeFile(path.join(source,'package.opf'),'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test</dc:identifier><dc:title>Test</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml" properties="scripted svg"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="js" href="evil.js" media-type="application/javascript"/><item id="pic" href="picture.svg" media-type="image/svg+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>');
  await fs.writeFile(path.join(source,'chapter.xhtml'),chapter);
  await fs.writeFile(path.join(source,'evil.js'),'window.externalRan=1');
  await fs.writeFile(path.join(source,'picture.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="window.svgFileRan=1"><script>window.svgFileRan=1</script><circle r="5" fill="blue"/></svg>');
  await fs.writeFile(path.join(source,'nav.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Test</a></li></ol></nav></body></html>');
  const output=path.join(dir,'web');
  execFileSync(process.execPath,[cli,'convert',source,output,template,'--no-remote-ui'],{stdio:'pipe'});
  const html=await fs.readFile(path.join(output,'index.html'),'utf8');
  const doc=new JSDOM(html).window.document,main=doc.querySelector('#webbook-main');
  assert.equal(main.querySelectorAll('script').length,0);
  for(const elm of [main,...main.querySelectorAll('*')])for(const attribute of elm.attributes)assert(!/^on/i.test(attribute.name),`${elm.localName} ${attribute.name}`);
  assert(!/javascript:/i.test(main.innerHTML.replace(/\s/g,'')),'no script links');
  assert(!main.querySelector('[srcdoc]'));
  assert.equal(main.querySelectorAll('animate').length,1,'an animation that isn\'t of an href stays');
  assert(!/headRan|bodyRan|inlineRan|svgRan|externalRan/.test(html));
  assert.match(main.textContent,/Words stay\./);assert.match(main.textContent,/A script link/);
  assert.equal(main.querySelector('a[href$="#top"]')!==null,true,'real links stay');
  // The reader's own: the inline bootstrap and its external copy
  assert.equal(doc.querySelectorAll('body > script:not([src])').length,1);
  assert(doc.querySelector('script[src="src/js/bootstrap.js"]'));
  // An SVG image keeps its picture, without its scripts
  const svg=await fs.readFile(path.join(output,'images/picture.svg'),'utf8');
  assert(!/svgFileRan|<script|onload/.test(svg),svg);assert.match(svg,/<circle[^>]*fill="blue"/);
  const report=await fs.readFile(path.join(output,'conversion-report.md'),'utf8');
  for(const kind of ['Scripts removed','Event handler attributes removed','Script links removed'])assert(report.includes(kind),kind);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
