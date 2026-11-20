import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync('themes/pmp-theme/includes/block-filters/utils.js','utf8');
const body=source.slice(source.indexOf('export function removeBlockByName'),source.indexOf('/**\n * Update block attributes'));
const remove=new Function(`${body.replace('export ', '')}; return removeBlockByName;`)();
test('removes image blocks recursively without mutating input',()=>{
 const input=[['core/group',{},[['core/post-featured-image',{}],['core/post-title',{}]]]];
 const clone=structuredClone(input);
 assert.deepEqual(remove('core/post-featured-image',input),[['core/group',{},[['core/post-title',{}]]]]);
 assert.deepEqual(input,clone);
});
if(source.includes('Object.entries(hasAttribute)')) {
 test('keeps secondary title metadata when removing only card images',()=>{
  const input=[['core/group',{},[['pmp/post-meta',{metaKey:'card_image',isImage:true}],['pmp/post-meta',{metaKey:'title_secondary',isTitle:true}]]]];
  assert.deepEqual(remove('pmp/post-meta',input,{metaKey:'card_image',isImage:true}),[['core/group',{},[['pmp/post-meta',{metaKey:'title_secondary',isTitle:true}]]]]);
 });
 test('handles undefined and malformed templates',()=>{
  assert.equal(remove('x',undefined),undefined);
  assert.deepEqual(remove('x',[null,['core/paragraph']]),[['core/paragraph']]);
 });
}
