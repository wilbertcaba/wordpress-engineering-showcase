import { decodeEntities } from '@wordpress/html-entities';

/**
 * Wrapper ids used by the block itself. Headings may never take these,
 * so both renderers seed their dedupe map with them.
 */
export const RESERVED_IDS = ['table-of-contents', 'table-of-contents-mobile'];

/**
 * Characters that Unicode normalization leaves untouched but PHP's
 * remove_accents() transliterates (ß becomes a single s there). Kept in
 * sync with the PHP side so editor previews and front-end ids agree.
 */
const LIGATURES = {
	æ: 'ae',
	Æ: 'AE',
	ø: 'o',
	Ø: 'O',
	ß: 's',
	œ: 'oe',
	Œ: 'OE',
	đ: 'd',
	Đ: 'D',
	ł: 'l',
	Ł: 'L',
	þ: 'th',
	Þ: 'TH',
	ð: 'd',
	Ð: 'D',
};

/**
 * Strip diacritics and transliterate common ligatures.
 *
 * @param {string} text Raw text.
 * @returns {string} ASCII-leaning text.
 */
export const removeAccents = (text) =>
	text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[æÆøØßœŒđĐłŁþÞðÐ]/g, (char) => LIGATURES[char]);

/**
 * Turn a heading's rich text value into plain text.
 *
 * @param {*} value RichTextData, string, or undefined.
 * @returns {string} Plain text with entities decoded.
 */
export const stripTags = (value) =>
	decodeEntities(
		String(value ?? '')
			.replace(/<[^>]*>/g, '')
			.replace(/\u00a0/g, ' '),
	)
		.replace(/\s+/g, ' ')
		.trim();

/**
 * Mirror of the core heading block's anchor generator and of
 * TocBlock::slugify() in PHP.
 *
 * @param {string} text Plain heading text.
 * @returns {string} Slug, possibly empty.
 */
export const getSlug = (text) =>
	removeAccents(text)
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.toLowerCase()
		.replace(/(^-+)|(-+$)/g, '');

/**
 * Create a dedupe helper that suffixes repeated slugs with -1, -2, ...
 * exactly like the core heading block does.
 *
 * @param {string[]} reserved Ids that are taken before any heading is seen.
 * @returns {{reserve: Function, next: Function}} Helper.
 */
export const createDedupe = (reserved = []) => {
	const used = new Set(reserved);

	return {
		/**
		 * Mark an existing id as taken.
		 *
		 * @param {string} id Existing id.
		 */
		reserve(id) {
			used.add(id);
		},
		/**
		 * Return a unique id for a slug and mark it as taken.
		 *
		 * @param {string} slug Base slug.
		 * @returns {string} Unique id, or empty string for an empty slug.
		 */
		next(slug) {
			if (!slug) {
				return '';
			}

			let candidate = slug;
			let i = 0;

			while (used.has(candidate)) {
				i += 1;
				candidate = `${slug}-${i}`;
			}

			used.add(candidate);

			return candidate;
		},
	};
};
