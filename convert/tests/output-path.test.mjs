import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const cli=fileURLToPath(new URL('../build/index.js',import.meta.url)),template=fileURLToPath(new URL('../template',import.meta.url));
async function book(dir){
 const source=path.join(dir,'book');await fs.mkdir(path.join(source,'META-INF'),{recursive:true});
 await fs.writeFile(path.join(source,'META-INF/container.xml'),'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 await fs.writeFile(path.join(source,'package.opf'),'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test</dc:identifier><dc:title>Test</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="chapter"/></spine></package>');
 await fs.writeFile(path.join(source,'chapter.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Test</title></head><body><h1>Test</h1><p>Words</p></body></html>');
 await fs.writeFile(path.join(source,'nav.xhtml'),'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Test</a></li></ol></nav></body></html>');
 return source;
}
const convert=(source,output,cwd)=>execFileSync(process.execPath,[cli,'convert',source,output,template,'--no-remote-ui'],{encoding:'utf8',stdio:'pipe',cwd});

test('the output folder may not be, contain or be inside the EPUB or the template, which stay untouched',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-output-path-'));
 try{
  const source=await book(dir);
  const before=await fs.readFile(path.join(source,'chapter.xhtml'),'utf8');
  for(const output of [source,dir,path.join(source,'out'),template,path.dirname(template),path.join(template,'out')]){
   assert.throws(()=>convert(source,output),error=>/overlaps the (EPUB|template)/.test(error.stderr+error.stdout),output);
  }
  // The same, through a symbolic link and a relative path
  await fs.symlink(source,path.join(dir,'link'));
  assert.throws(()=>convert(source,'link',dir),error=>/overlaps the EPUB/.test(error.stderr+error.stdout));
  assert.equal(await fs.readFile(path.join(source,'chapter.xhtml'),'utf8'),before);
  assert.equal((await fs.lstat(path.join(dir,'link'))).isSymbolicLink(),true);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('a finished book replaces the earlier one, and nothing is left beside it',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-output-replace-'));
 try{
  const source=await book(dir),output=path.join(dir,'web');
  await fs.mkdir(output);await fs.writeFile(path.join(output,'stale.txt'),'old');
  convert(source,output);
  await assert.rejects(fs.access(path.join(output,'stale.txt')));
  await fs.access(path.join(output,'index.html'));
  assert.deepEqual((await fs.readdir(dir)).sort(),['book','web']);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
