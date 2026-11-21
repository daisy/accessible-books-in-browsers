import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';

const cli=fileURLToPath(new URL('../build/index.js',import.meta.url)),template=fileURLToPath(new URL('../template',import.meta.url));

test('encoded file names, the book\'s own audio and video, and links to its contents document all reach the web book',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-resources-'));
 try{
  const source=path.join(dir,'book');await fs.mkdir(path.join(source,'META-INF'),{recursive:true});await fs.mkdir(path.join(source,'text'));await fs.mkdir(path.join(source,'media'));
  await fs.writeFile(path.join(source,'META-INF/container.xml'),'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  await fs.writeFile(path.join(source,'package.opf'),'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test</dc:identifier><dc:title>Test</dc:title><dc:language>en</dc:language></metadata><manifest>'
   +'<item id="c1" href="text/chapter%20one.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/two.xhtml" media-type="application/xhtml+xml"/>'
   +'<item id="pic" href="media/my%20pic%23.png" media-type="image/png"/><item id="song" href="media/song.mp3" media-type="audio/mpeg"/><item id="film" href="media/film.mp4" media-type="video/mp4"/><item id="cc" href="media/film.vtt" media-type="text/vtt"/><item id="poster" href="media/poster.png" media-type="image/png"/>'
   +'<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>');
  await fs.writeFile(path.join(source,'text/chapter one.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>One</title></head><body><h1>One</h1><p><img src="../media/my%20pic%23.png" alt="A picture"/></p>'
   +'<audio controls="controls"><source src="../media/song.mp3" type="audio/mpeg"/>A song</audio>'
   +'<video controls="controls" poster="../media/poster.png" src="../media/film.mp4"><track kind="captions" src="../media/film.vtt" srclang="en" label="English"/></video>'
   +'<p><a href="two.xhtml">Next</a> and <a href="../nav.xhtml">Show detailed contents</a></p></body></html>');
  await fs.writeFile(path.join(source,'text/two.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Two</title></head><body><h1>Two</h1><p><a href="chapter%20one.xhtml">Back</a></p></body></html>');
  for(const [name,bytes] of [['my pic#.png','png'],['song.mp3','mp3'],['film.mp4','mp4'],['film.vtt','WEBVTT\n'],['poster.png','poster']])await fs.writeFile(path.join(source,'media',name),bytes);
  await fs.writeFile(path.join(source,'nav.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="text/chapter%20one.xhtml">One</a></li><li><a href="text/two.xhtml">Two</a></li></ol></nav></body></html>');
  const output=path.join(dir,'web');
  execFileSync(process.execPath,[cli,'convert',source,output,template,'--no-remote-ui'],{stdio:'pipe'});
  const one=new JSDOM(await fs.readFile(path.join(output,'index.html'),'utf8')).window.document;
  // Each reference names a file that's there, decoded as a URL would be
  const exists=async href=>{await fs.access(path.join(output,decodeURIComponent(href)));return true;};
  const img=one.querySelector('#webbook-main img').getAttribute('src');assert.equal(img,'images/my%20pic%23.png');assert(await exists(img));
  for(const [selector,attribute] of [['audio source','src'],['video','src'],['video','poster'],['track','src']]){
   const href=one.querySelector(`#webbook-main ${selector}`).getAttribute(attribute);
   assert.match(href,/^images\//,`${selector} ${attribute}`);assert(await exists(href),href);
  }
  const links=Array.from(one.querySelectorAll('#webbook-main a'),a=>a.getAttribute('href'));
  assert(links.includes('two.html'));assert(links.includes('toc.html'));
  const two=new JSDOM(await fs.readFile(path.join(output,'two.html'),'utf8')).window.document;
  assert.equal(two.querySelector('#webbook-main p a').getAttribute('href'),'index.html');
  // The contents list has the two chapters and nothing from the navigation document itself
  const toc=new JSDOM(await fs.readFile(path.join(output,'toc.html'),'utf8')).window.document;
  assert.deepEqual(Array.from(toc.querySelectorAll('#webbook-main a'),a=>a.getAttribute('href')),['index.html','two.html']);
  const report=await fs.readFile(path.join(output,'conversion-report.md'),'utf8');
  assert(!/Broken links/.test(report),report.match(/Broken links[\s\S]{0,400}/)?.[0]);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
