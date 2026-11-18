import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {copyUiAssets} from '../build/assets.js';
test('reader inventory is deterministic, hashes the delivered combined CSS and includes lazy assets without listing itself',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'webbook-ui-inventory-'));
 try{
  const template=path.join(root,'template');await fs.outputFile(path.join(template,'src/css/style.css'),'@import "part.css";\nmain{color:red}');await fs.outputFile(path.join(template,'src/css/part.css'),'p{font-style:italic}');
  await fs.outputFile(path.join(template,'src/js/vendor.js'),'export const vendor=1;');
  await fs.outputFile(path.join(template,'src/js/main.js'),'import("./vendor/lazy.js")');await fs.outputFile(path.join(template,'src/js/vendor/lazy.js'),'export const value=1;');
  const inventories=[];
  for(const dirname of ['one','two']){
   const stagingDir=path.join(root,dirname);await copyUiAssets(template,{stagingDir});const inventory=await fs.readJson(path.join(stagingDir,'src/ui-files.json'));inventories.push(inventory);
   assert.deepEqual(inventory.files.map(file=>file.href),inventory.files.map(file=>file.href).sort());assert.equal(inventory.version,1);assert.equal(inventory.contract,0);assert.equal(inventory.files.length,4);assert(inventory.files.some(file=>file.href==='src/js/vendor/lazy.js'));assert(!inventory.files.some(file=>file.href.endsWith('ui-files.json')||file.href.endsWith('part.css')));
   for(const file of inventory.files){const bytes=await fs.readFile(path.join(stagingDir,file.href));assert.equal(file.bytes,bytes.length);assert.equal(file.sha256,createHash('sha256').update(bytes).digest('hex'));}
  }
  assert.deepEqual(inventories[0],inventories[1]);
 }finally{await fs.remove(root);}
});
