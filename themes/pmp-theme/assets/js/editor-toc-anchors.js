/**
 * Showcase compatibility for WordPress 6.8: generate missing anchors in one
 * document pass. Core's per-heading effects can assign the same ID to repeated
 * headings mounted together. Explicit anchors are preserved.
 */
import { subscribe, select, dispatch } from '@wordpress/data';
import {
	createDedupe,
	RESERVED_IDS,
	getSlug,
	stripTags,
} from '../../includes/blocks/toc-block/slug';
import { scanHtmlHeadings } from '../../includes/blocks/toc-block/utils';
let previous;
let queued = false;
const sync = () => {
	queued = false;
	const store = select('core/block-editor');
	const blocks = store?.getBlocks();
	if (!blocks || blocks === previous) return;
	previous = blocks;
	const flatten = (items) => items.flatMap((block) => [block, ...flatten(block.innerBlocks || [])]);
	const all = flatten(blocks);
	const dedupe = createDedupe(RESERVED_IDS);
	all.forEach((block) => {
		if (block.name === 'core/heading' && block.attributes.anchor)
			dedupe.reserve(block.attributes.anchor);
		if (['core/html', 'core/freeform'].includes(block.name)) {
			scanHtmlHeadings(String(block.attributes.content || '')).forEach((heading) => {
				if (heading.id) dedupe.reserve(heading.id);
			});
		}
	});
	all.forEach((block) => {
		if (['core/html', 'core/freeform'].includes(block.name)) {
			scanHtmlHeadings(String(block.attributes.content || '')).forEach((heading) => {
				if (!heading.id) dedupe.next(getSlug(stripTags(heading.html)));
			});
		}
		if (block.name !== 'core/heading' || block.attributes.anchor) return;
		const anchor = dedupe.next(getSlug(stripTags(block.attributes.content)));
		if (anchor) dispatch('core/block-editor').updateBlockAttributes(block.clientId, { anchor });
	});
};
subscribe(() => {
	if (!queued) {
		queued = true;
		queueMicrotask(sync);
	}
});
