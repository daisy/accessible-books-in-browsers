import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initSettings} from '../src/js/settings.js';
import {initWritingMode} from '../src/js/writing-mode.js';
import {initAppearance,applyAppearance} from '../src/js/appearance.js';
import {publishedAppearanceActive} from '../src/js/appearance-state.js';
import {getActions,runAction,initReaderActionStatus} from '../src/js/reader-actions.js';
import {initSettingsFilter,applySettingsFilter} from '../src/js/settings-filter.js';
import {highlightElm} from '../src/js/narration-position.js';
function setup({design=true,saved={}}={}){
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://books.example/index.html'});
 for(const name of ['window','document','localStorage','Event','CustomEvent'])globalThis[name]=dom.window[name];
 if(design)document.documentElement.setAttribute('data-webbook-has-published','');
 for(const [key,value] of Object.entries(saved))localStorage.setItem(key,value);
 window.scrollTo=()=>{};initSettings();initWritingMode();initReaderActionStatus();initAppearance();initSettingsFilter();return dom;
}
test('Appearance radios default to My settings, sit above Colors and restore the choice for this book',()=>{
 const dom=setup();assert.equal(publishedAppearanceActive(),false);
 const group=document.getElementById('webbook-publisher-appearance');
 assert.equal(group.getAttribute('aria-labelledby'),'webbook-settings-appearance-hd');assert.equal(document.getElementById('webbook-settings-appearance-hd').textContent,'Appearance option');assert.ok(group.closest('[data-settings-section="appearance"]'));
 assert.equal(group.compareDocumentPosition(document.querySelector('[data-settings-section="colors"]')) & 4,4);
 assert.equal(document.getElementById('webbook-appearance-settings').checked,true);
 assert.equal(group.querySelectorAll('input[type="radio"]').length,2);
 const radio=document.getElementById('webbook-appearance-published');radio.checked=true;radio.dispatchEvent(new Event('change'));
 assert.equal(publishedAppearanceActive(),true);assert.equal(localStorage.getItem('webbook-appearance:gibberish-field-notes-template-sample'),'published');
 const saved=Object.fromEntries(Object.entries(localStorage));dom.window.close();
 const restored=setup({saved});assert.equal(publishedAppearanceActive(),true);restored.window.close();
});
test('no publisher styles hides the group and action; no JavaScript uses My settings',()=>{
 const dom=setup({design:false,saved:{'webbook-appearance:gibberish-field-notes-template-sample':'published'}});
 assert.equal(publishedAppearanceActive(),false);assert.equal(document.getElementById('webbook-publisher-appearance'),null);assert.equal(runAction('switch-appearance'),false);
 assert.equal(applySettingsFilter('publisher original'),0);dom.window.close();
 const plain=new JSDOM('<html data-webbook-has-published><body>Book</body></html>');assert.equal(plain.window.document.documentElement.hasAttribute('data-webbook-appearance'),false);plain.window.close();
});
test('shortcut names and announces the choice; replaced rows hide and saved values return',async()=>{
 const dom=setup({saved:{'webbook-colors':'dark','webbook-font-family':'serif','webbook-line-height':'2'}});
 const action=getActions().find(action=>action.id==='switch-appearance');
 assert.equal(action.label,'Switch between As published and My settings');assert.equal(action.defaultKeys[0].code,'KeyD');assert.equal(action.defaultKeys[0].alt,true);assert.equal(action.defaultKeys[0].shift,true);
 assert.equal(runAction('switch-appearance'),true);await new Promise(resolve=>setTimeout(resolve,45));
 assert.equal(document.getElementById('webbook-action-status').textContent,'As published');
 for(const id of ['webbook-colors','webbook-colors-custom','webbook-font-family','webbook-font-size','webbook-text-spacing','webbook-writing-mode-row'])assert.equal(document.getElementById(id).classList.contains('webbook-appearance-hidden'),true,id);
 assert.equal(document.querySelectorAll('[aria-describedby*="paused"]').length,0);
 assert.equal(document.getElementById('webbook-highlight-style').classList.contains('webbook-appearance-hidden'),false);
 assert.equal(localStorage.getItem('webbook-colors'),'dark');assert.equal(localStorage.getItem('webbook-font-family'),'serif');assert.equal(localStorage.getItem('webbook-line-height'),'2');
 assert.equal(document.documentElement.hasAttribute('data-webbook-colors'),false);
 assert.equal(document.getElementById('webbook-publisher-appearance-note').hidden,false);
 runAction('switch-appearance');await new Promise(resolve=>setTimeout(resolve,45));
 assert.equal(document.getElementById('webbook-action-status').textContent,'My settings');assert.equal(document.documentElement.hasAttribute('data-webbook-colors'),true);
 assert.equal(document.getElementById('webbook-colors-options').value,'dark');assert.equal(document.getElementById('webbook-font-family-options').value,'serif');
 assert.equal(document.getElementById('webbook-line-height-options').value,'2');
 assert.equal(document.querySelectorAll('.webbook-appearance-hidden').length,0);assert.equal(document.getElementById('webbook-publisher-appearance-note').hidden,true);dom.window.close();
});
test('Find a setting finds Appearance for hidden preferences and counts no hidden rows',()=>{
 const dom=setup();applyAppearance({persist:true});
 for(const query of ['font','size','line length','writing direction','publisher','original']){
  assert.equal(applySettingsFilter(query),1,query);
  assert.equal(document.getElementById('webbook-publisher-appearance').classList.contains('webbook-settings-filtered'),false);
 }
 const filter=document.getElementById('webbook-settings-filter');filter.value='font';applySettingsFilter('font');
 applyAppearance({persist:false});assert.ok(applySettingsFilter('font')>1);
 applyAppearance({persist:true});assert.equal(applySettingsFilter('font'),1);dom.window.close();
});
test('turning the design on and off preserves the paused text position without moving focus',()=>{
 const dom=setup();document.querySelector('main').innerHTML='<p id="place">A reading position.</p>';
 const paragraph=document.getElementById('place');let scroll=0;
 Object.defineProperty(window,'scrollY',{get:()=>scroll,configurable:true});window.scrollTo=({top=0})=>{scroll=top;};
 paragraph.getBoundingClientRect=()=>({top:(publishedAppearanceActive()?240:120)-scroll,bottom:(publishedAppearanceActive()?280:160)-scroll,left:10,right:200});paragraph.getClientRects=()=>[paragraph.getBoundingClientRect()];
 const toggle=document.getElementById('webbook-appearance-published');toggle.focus();
 applyAppearance({persist:true,preservePosition:true});assert.equal(scroll,120);assert.equal(paragraph.getBoundingClientRect().top,120);assert.equal(document.activeElement,toggle);
 applyAppearance({persist:false,preservePosition:true});assert.equal(scroll,0);assert.equal(paragraph.getBoundingClientRect().top,120);dom.window.close();
});
test('a playing phrase survives the switch with its audio time and highlight unchanged',()=>{
 const dom=setup();document.querySelector('main').innerHTML='<p id="phrase">Playing phrase.</p>';
 const audio=document.querySelector('audio'),phrase=document.getElementById('phrase');let pauses=0,plays=0;
 Object.defineProperty(audio,'paused',{value:false,configurable:true});audio.currentTime=12.5;audio.pause=()=>{pauses++;};audio.play=()=>{plays++;return Promise.resolve();};
 phrase.getBoundingClientRect=()=>({top:100,bottom:130,left:0,right:200});highlightElm(phrase,{placement:'none'});
 applyAppearance({persist:true,preservePosition:true});assert.equal(audio.currentTime,12.5);assert.equal(audio.paused,false);assert.equal(pauses,0);assert.equal(plays,0);assert.ok(phrase.isConnected);dom.window.close();
});
test('old Original/reader values are no choices; repaired Automatic and first spacing steps stay unset',()=>{
 const dom=setup({saved:Object.fromEntries(['font-family','font-size','line-height','letter-spacing','word-spacing','line-length','colors'].map(k=>['webbook-'+k,'original']))});
 for(const select of document.querySelectorAll('#webbook-settings select'))assert.equal(Array.from(select.options).some(option=>option.value==='original'),false);
 assert.equal(document.getElementById('webbook-font-family-options').value,'system-ui');assert.equal(document.getElementById('webbook-line-height-options').value,'');assert.equal(document.getElementById('webbook-colors-options').value,'');
 assert.equal(document.documentElement.hasAttribute('data-webbook-colors'),false);assert.equal(document.documentElement.hasAttribute('data-webbook-line-height'),false);dom.window.close();
});
test('hidden content is never narrated, even through a note playback exception',async()=>{
 const dom=setup();globalThis.CSS={escape:value=>value};const {canPlay,allowPlaybackOf,clearPlaybackException}=await import('../src/js/skippability.js');
 document.querySelector('main').innerHTML='<div class="webbook-style-hidden"><p id="hidden">Hidden</p></div><div class="webbook-style-invisible"><p id="quiet">Quiet</p><p id="visible" class="webbook-style-visible">Visible</p></div>';
 allowPlaybackOf('hidden');assert.equal(canPlay(document.getElementById('hidden')),false);clearPlaybackException();assert.equal(canPlay(document.getElementById('quiet')),false);assert.equal(canPlay(document.getElementById('visible')),true);dom.window.close();
});

test('the Appearance choice is remembered for each book, and says so',()=>{
 const dom=setup({saved:{'webbook-appearance:another-book':'published'}});
 assert.equal(publishedAppearanceActive(),false);
 const scope=document.getElementById('webbook-publisher-appearance-scope');
 assert.equal(scope.textContent,'Remembered for this book.');
 assert.equal(document.getElementById('webbook-publisher-appearance').getAttribute('aria-describedby'),scope.id);
 applyAppearance({persist:true});
 assert.equal(localStorage.getItem('webbook-appearance:another-book'),'published');
 assert.equal(localStorage.getItem('webbook-appearance:gibberish-field-notes-template-sample'),'published');
 assert.equal(localStorage.getItem('webbook-publisher-appearance'),null);
 dom.window.close();
});

test('As published, the reader UI takes the book page colors, readable, and My settings gives them back',()=>{
 const dom=setup();
 const main=document.querySelector('main');main.style.backgroundColor='rgb(32, 32, 32)';main.style.color='rgb(70, 70, 70)';
 applyAppearance({persist:true});
 const root=document.documentElement;
 assert.ok(root.hasAttribute('data-webbook-published-colors'));
 assert.equal(root.style.getPropertyValue('--webbook-published-bg'),'#202020');
 // The publisher's text is too faint for the UI on that background, so the UI uses white
 assert.equal(root.style.getPropertyValue('--webbook-published-fg'),'#ffffff');
 assert.ok(root.classList.contains('webbook-dark'));
 applyAppearance({persist:false});
 assert.equal(root.hasAttribute('data-webbook-published-colors'),false);
 assert.equal(root.style.getPropertyValue('--webbook-published-bg'),'');
 dom.window.close();
});
test('As published leaves the saved light or dark theme alone',()=>{
 const dom=setup({saved:{'webbook-appearance':'dark'}});
 document.querySelector('main').style.backgroundColor='rgb(255, 255, 255)';
 applyAppearance({persist:true});
 assert.ok(document.documentElement.classList.contains('webbook-light'));
 assert.equal(localStorage.getItem('webbook-appearance'),'dark');
 dom.window.close();
});
