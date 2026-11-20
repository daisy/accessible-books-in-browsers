import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
test('CLI announces the default channel, records an explicit bundled choice, and freezes a readable bootstrap with its tested policy',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-ui-choice-'));
 try{
  const source=path.join(dir,'source book');await fs.mkdir(path.join(source,'META-INF'),{recursive:true});
  await fs.writeFile(path.join(source,'META-INF/container.xml'),'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  await fs.writeFile(path.join(source,'package.opf'),'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test</dc:identifier><dc:title>Test</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="chapter"/></spine></package>');
  await fs.writeFile(path.join(source,'chapter.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Test</title></head><body><h1>Test</h1><p>Words</p></body></html>');
  await fs.writeFile(path.join(source,'nav.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Test</a></li></ol></nav></body></html>');
  const cli=fileURLToPath(new URL('../build/index.js',import.meta.url)),template=fileURLToPath(new URL('../template',import.meta.url));
  const run=(name,flags=[])=>{const output=path.join(dir,name);const stdout=execFileSync(process.execPath,[cli,'convert',source,output,template,...flags],{encoding:'utf8',stdio:'pipe',env:{...process.env,WEBBOOK_UI_BASE_URL:''}});return {output,stdout};};
  const normal=run('default');assert.match(normal.stdout,/READER UPDATES/);assert.match(normal.stdout,/--no-remote-ui/);
  const doc=new JSDOM(await fs.readFile(path.join(normal.output,'index.html'),'utf8')).window.document;
  assert.equal(doc.querySelector('meta[name="webbook-ui-channel"]').content,'https://webbook.daisy.org/ui/releases/v0/');
  const bootstrap=await fs.readFile(path.join(normal.output,'src/js/bootstrap.js'),'utf8');
  assert.match(bootstrap,/function validateManifest\(/);
  assert.match(bootstrap,/function selectionDecision\(/);
  assert.equal(doc.body.querySelector('script:not([src])').textContent,bootstrap);
  assert(!/^import /m.test(bootstrap));
  const report=JSON.parse(await fs.readFile(path.join(normal.output,'conversion-report.json'),'utf8'));
  assert.equal(report.options['reader updates'],doc.querySelector('meta[name="webbook-ui-channel"]').content);
  assert.match(report.betaWarning,/--no-remote-ui/);
  const bundled=run('bundled',['--no-remote-ui']);assert.match(bundled.stdout,/fixed bundled reader/);
  assert.equal(new JSDOM(await fs.readFile(path.join(bundled.output,'index.html'),'utf8')).window.document.querySelector('meta[name="webbook-ui-channel"]'),null);
  assert.equal(JSON.parse(await fs.readFile(path.join(bundled.output,'conversion-report.json'),'utf8')).options['reader updates'],'bundled (fixed copy)');
  const custom=run('custom',['--ui-base-url','http://127.0.0.1:9000/v0/']);assert.match(custom.stdout,/127.0.0.1:9000/);
  assert.throws(()=>run('conflicting',['--no-remote-ui','--ui-base-url','https://reader.example/v0/']));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
