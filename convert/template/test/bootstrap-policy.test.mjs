import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validChannel, overrideDecision, validateManifest, releaseSelection, selectionDecision, verifyInventory, finalSelection, baselineDecision, failureDecision} from '../src/js/bootstrap-policy.js';
const local={local:true},channel='https://reader.example/v0/',options={contract:0,channel,local};
const manifest={contract:0,version:'A',minBootstrap:1,script:'A/main.js',stylesheet:'A/style.css',worker:'A/offline-worker.js'};
const selected=validateManifest(manifest,options);
const files=['main.js','style.css','offline-worker.js'].map(href=>({href,sha256:'ab'.repeat(32)}));
const inventory={version:1,contract:0,files};
test('manifest decisions reject incompatible contracts, bootstrap/protocol versions and escaped release URLs',()=>{
 assert.equal(validateManifest({contract:0,useLocal:true},options),local);
 assert.equal(selected.version,'A');
 for(const bad of [{contract:1},{minBootstrap:2},{minBootstrap:0},{protocol:2},{version:'../A'},{script:'https://elsewhere.example/main.js'},{script:'A/../B/main.js'},{script:'A/main.js?other'},{stylesheet:'A/style.css#other'}])assert.throws(()=>validateManifest({...manifest,...bad},options),JSON.stringify(bad));
 assert.equal(releaseSelection('A',options).inventory,channel+'A/ui-files.json');
});
test('channel URLs require a safe directory URL',()=>{
 for(const value of ['http://remote.example/v0/','https://a:b@reader.example/v0/','https://reader.example/v0/?token=x','https://reader.example/v0/#x','https://reader.example/v0','file:///v0/','junk'])assert.equal(validChannel(value),null,value);
 assert.equal(validChannel(channel),channel);assert.equal(validChannel('http://127.0.0.1:9000/v0/'),'http://127.0.0.1:9000/v0/');
});
test('every selection requires script and stylesheet integrity, including saved and explicitly pinned releases',()=>{
 const verified=verifyInventory(selected,inventory);
 assert.match(verified.integrity.script,/^sha256-/);assert.equal(verified.integrity.script,verified.integrity.stylesheet);
 for(const missing of [undefined,{...inventory,contract:1},{...inventory,files:files.slice(1)},{...inventory,files:files.filter(f=>f.href!=='style.css')},{...inventory,files:files.slice(0,2)},{...inventory,files:[...files,{...files[0]}]},{...inventory,files:files.map(f=>({...f,sha256:'bad'}))}])assert.throws(()=>verifyInventory(selected,missing));
 assert.throws(()=>verifyInventory({...selected,integrity:{script:'sha256-wrong'}},inventory));
 const saved={...inventory,files:files.map(({href,sha256})=>({url:channel+'A/'+href,sha256}))};
 assert.deepEqual(verifyInventory(selected,saved).integrity,verified.integrity);
 assert.deepEqual(verifyInventory(releaseSelection('A',options),inventory).integrity,verified.integrity);
});
test('override decisions distinguish persistent local, session tests, auto and invalid shared links',()=>{
 assert.deepEqual(overrideDecision('local',null),{value:'local',changed:true,persistent:true});
 for(const value of ['remote','release:A'])assert.deepEqual(overrideDecision(value,'local'),{value,changed:true,persistent:false});
 assert.deepEqual(overrideDecision('auto','local'),{value:null,changed:true,persistent:false});
 for(const invalid of ['release:../A','release:','other',null])assert.deepEqual(overrideDecision(invalid,'local'),{value:'local',changed:false});
});
test('saved and uncertain state outrank the latest cached manifest; explicit test overrides do not alter it',()=>{
 const saved={remote:{channel,version:'A',files}};
 const base={channel,local,cached:{version:'B'}};
 assert.deepEqual(selectionDecision({...base,saved}),{version:'A',files,saved:true});
 for(const saved of [{unknown:true},{localOnly:true},{remote:{channel:'https://different.example/',version:'A'}}])assert.equal(selectionDecision({...base,saved}).selected,local);
 assert.deepEqual(selectionDecision({...base,saved,override:'release:C'}),{version:'C'});
 assert.deepEqual(selectionDecision({...base,saved,override:'remote'}),{fetch:true});
 assert.equal(selectionDecision({...base,override:'local'}).selected,local);
 assert.equal(selectionDecision({...base,forceLocal:true}).selected,local);
});
test('cached manifests are used immediately and revalidated; rollback or kill switches apply at the next selection',()=>{
 const cached={version:'B'};assert.deepEqual(selectionDecision({channel,local,cached}),{selected:cached,refresh:true});
 assert.deepEqual(selectionDecision({channel,local}),{fetch:true});
 assert.deepEqual(selectionDecision({channel,local,cached:{version:'A'}}),{selected:{version:'A'},refresh:true});
 assert.equal(selectionDecision({channel,local,cached:validateManifest({contract:0,useLocal:true},options)}).selected,local);
});
test('bad releases and forced retry choose local; crash transitions stop at a clean baseline',()=>{
 assert.equal(finalSelection(selected,{bad:true,local}),local);
 assert.equal(finalSelection(selected,{forceLocal:true,local}),local);
 assert.equal(finalSelection(selected,{local}),selected);
 assert.equal(failureDecision(false,false),'local');assert.equal(failureDecision(false,true),'reload-local');assert.equal(failureDecision(true,true),'baseline');
 assert.equal(baselineDecision({failed:true}),true);assert.equal(baselineDecision({urlBaseline:true}),true);
 assert.equal(baselineDecision({failed:true,urlBaseline:true,auto:true}),false);
 assert.equal(baselineDecision({file:true,auto:true}),true);
});
