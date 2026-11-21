import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const base = new URL('../themes/pmp-theme/includes/blocks/toc-block/', import.meta.url);
const slug = readFileSync(new URL('slug.js', base), 'utf8')
	.replace(/^import .*;$/m, '')
	.replaceAll('export ', '');
const utils = readFileSync(new URL('utils.js', base), 'utf8').replaceAll('export ', '');
const context = vm.createContext({
	decodeEntities: (s) => s.replaceAll('&amp;', '&'),
	DOMParser: class {},
});
vm.runInContext(
	slug + '\n' + utils + '\nthis.api = {getSlug,createDedupe,buildTree,boxToCSS,borderToProps};',
	context,
);
const { getSlug, createDedupe, buildTree, boxToCSS } = context.api;
test('toc: slugs transliterate accents and deduplicate reserved IDs', () => {
	assert.equal(getSlug('Café & answers'), 'cafe-answers');
	assert.equal(getSlug('Æther Straße'), 'aether-strase');
	const d = createDedupe(['table-of-contents']);
	assert.equal(d.next('table-of-contents'), 'table-of-contents-1');
	assert.equal(d.next('repeat'), 'repeat');
	assert.equal(d.next('repeat'), 'repeat-1');
	d.reserve('manual');
	assert.equal(d.next('manual'), 'manual-1');
});
test('toc: skipped heading levels form a nested tree without empty levels', () => {
	const tree = buildTree([
		{ level: 3, text: 'First', anchor: 'first' },
		{ level: 5, text: 'Child', anchor: 'child' },
		{ level: 2, text: 'Next', anchor: 'next' },
	]);
	assert.equal(tree.length, 2);
	assert.equal(tree[0].children[0].anchor, 'child');
	assert.equal(tree[1].anchor, 'next');
});
test('toc: per-side padding preserves zero and spacing presets', () => {
	assert.equal(
		boxToCSS({ top: '0', left: 'var:preset|spacing|16' }),
		'0 0 0 var(--wp--preset--spacing--16)',
	);
	assert.equal(boxToCSS({}), '');
});

test('toc: batched editor generation avoids simultaneous duplicate anchors and preserves manual IDs', () => {
	const blocks = [
		{ clientId: 'a', name: 'core/heading', attributes: { content: 'Repeated' } },
		{ clientId: 'b', name: 'core/heading', attributes: { content: 'Repeated' } },
		{
			clientId: 'c',
			name: 'core/heading',
			attributes: { content: 'Manual', anchor: 'repeated-1' },
		},
	];
	const source = readFileSync(
		new URL('../themes/pmp-theme/assets/js/editor-toc-anchors.js', import.meta.url),
		'utf8',
	).replace(/^import[\s\S]*?from ['"][^'"]+['"];$/gm, '');
	const sandbox = vm.createContext({
		decodeEntities: (s) => s,
		DOMParser: class {},
		subscribe: () => {},
		queueMicrotask: () => {},
		select: () => ({ getBlocks: () => blocks }),
		dispatch: () => ({
			updateBlockAttributes: (id, attrs) =>
				Object.assign(blocks.find((b) => b.clientId === id).attributes, attrs),
		}),
	});
	vm.runInContext(slug + '\n' + utils + '\n' + source + '\nthis.run=sync;', sandbox);
	sandbox.run();
	assert.deepEqual(
		blocks.map((b) => b.attributes.anchor),
		['repeated', 'repeated-2', 'repeated-1'],
	);
});
