import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initOfflineReading} from '../src/js/offline.js';
import {getActions} from '../src/js/reader-actions.js';
test('offline UI is a labeled About section, unavailable storage preserves ordinary reading and all actions are remappable',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://books.example/book/index.html'});
 for(const name of ['window','document','localStorage','location'])globalThis[name]=dom.window[name];
 try{
  const main=document.querySelector('main'),words=main.textContent,nativeControls=document.querySelector('audio').hasAttribute('controls');
  initOfflineReading();initOfflineReading();
  assert.equal(document.querySelectorAll('#webbook-offline').length,1);
  assert.equal(document.querySelector('#webbook-offline').closest('#webbook-info').id,'webbook-info');
  assert.equal(document.querySelector('#webbook-offline').getAttribute('aria-labelledby'),'webbook-offline-heading');
  assert.equal(document.querySelector('#webbook-offline a').href,'https://books.example/book/src/offline-books.html');
  assert.equal(document.querySelector('label[for="webbook-offline-progress"]').textContent,'Book download');
  assert.equal(document.querySelector('#webbook-offline-status').getAttribute('role'),'status');
  assert.match(document.querySelector('#webbook-offline-status').textContent,/unavailable/);
  assert.equal(document.querySelector('#webbook-offline-save').disabled,true);assert.equal(document.querySelector('#webbook-offline-progress').hidden,true);
  for(const id of ['open-offline','save-offline','cancel-offline','check-offline','update-offline','use-offline-update','remove-offline']){const action=getActions().find(action=>action.id===id);assert(action,id);assert.deepEqual(action.defaultKeys,[]);}
  assert.equal(main.textContent,words);assert.equal(document.querySelector('audio').hasAttribute('controls'),nativeControls);
 }finally{dom.window.close();}
});
