/**
 * Convert a spacing preset token to its CSS custom property.
 *
 * @param {string} value Raw value, e.g. `var:preset|spacing|16` or `8px`.
 * @returns {string} CSS value.
 */
export const presetToVar = (value) =>
	typeof value === 'string'
		? value.replace(/^var:preset\|spacing\|(.+)$/, 'var(--wp--preset--spacing--$1)')
		: value;

/**
 * Turn a BoxControl value into a CSS shorthand.
 *
 * @param {object|undefined} box Sides object.
 * @returns {string} Shorthand or empty string when nothing is set.
 */
export const boxToCSS = (box) => {
	if (!box || typeof box !== 'object') {
		return '';
	}

	const sides = ['top', 'right', 'bottom', 'left'].map((side) =>
		box[side] ? presetToVar(box[side]) : null,
	);

	if (sides.every((side) => side === null)) {
		return '';
	}

	return sides.map((side) => side ?? '0').join(' ');
};

/**
 * Turn a BorderRadiusControl value into a CSS shorthand.
 *
 * @param {string|object|undefined} radius Single value or per-corner object.
 * @returns {string} Shorthand or empty string when nothing is set.
 */
export const radiusToCSS = (radius) => {
	if (!radius) {
		return '';
	}

	if (typeof radius === 'string') {
		return radius;
	}

	if (typeof radius !== 'object') {
		return '';
	}

	const corners = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].map(
		(corner) => radius[corner] || null,
	);

	if (corners.every((corner) => corner === null)) {
		return '';
	}

	return corners.map((corner) => corner ?? '0').join(' ');
};

const BORDER_STYLES = ['solid', 'dashed', 'dotted'];
const SIDES = ['top', 'right', 'bottom', 'left'];

/**
 * Whether a BorderBoxControl value is split per side.
 *
 * @param {object} border Control value.
 * @returns {boolean} True when it holds per-side objects.
 */
const isSplitBorder = (border) => SIDES.some((side) => side in border);

/**
 * One side's `{ width, style, color }` as a border shorthand.
 *
 * @param {object|undefined} side  Side value.
 * @param {string}           color Color override (active state), optional.
 * @returns {string} Shorthand or empty string when the side has no width.
 */
const sideShorthand = (side, color = '') => {
	if (!side || typeof side !== 'object' || !side.width) {
		return '';
	}

	const style = BORDER_STYLES.includes(side.style) ? side.style : 'solid';

	return `${side.width} ${style} ${color || side.color || 'currentColor'}`;
};

/**
 * Split a BorderBoxControl value (flat or per side) into the custom
 * properties the stylesheet reads: one shorthand per side, plus an active
 * variant per side when an active border color is set.
 *
 * @param {object|undefined} border      Control value.
 * @param {string}           activeColor Active border color, optional.
 * @returns {object} Custom property map, empty when no side has a width.
 */
export const borderToProps = (border, activeColor = '') => {
	if (!border || typeof border !== 'object') {
		return {};
	}

	const split = isSplitBorder(border);
	const props = {};

	SIDES.forEach((side) => {
		const value = split ? border[side] : border;
		const shorthand = sideShorthand(value);

		if (!shorthand) {
			return;
		}

		props[`--toc-item-border-${side}`] = shorthand;

		if (activeColor) {
			props[`--toc-item-border-${side}-active`] = sideShorthand(value, activeColor);
		}
	});

	return props;
};

const HEADING_REGEX = /<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1\s*>/gi;
const ID_ATTRIBUTE_REGEX = /\bid\s*=\s*["']([^"']+)["']/i;

/**
 * Plain headings in a raw HTML fragment (Classic block, Custom HTML block),
 * in document order. Mirrors TocBlock::collect_html_headings() in PHP.
 *
 * @param {string} html HTML fragment.
 * @returns {Array<{level: number, id: string, html: string}>} Headings with their inner HTML.
 */
export const scanHtmlHeadings = (html) => {
	const found = [];

	if (!html || !/<h[1-6]/i.test(html)) {
		return found;
	}

	for (const match of String(html).matchAll(HEADING_REGEX)) {
		const idMatch = (match[2] || '').match(ID_ATTRIBUTE_REGEX);

		found.push({
			level: Number(match[1]),
			id: idMatch ? idMatch[1] : '',
			html: match[3],
		});
	}

	return found;
};

/**
 * Nest a flat, ordered list of headings by level.
 *
 * Skipped levels nest one step only (H2 then H4 nests H4 under the H2) and a
 * leading H3 becomes a root. Mirrors TocBlock::assign_depths() in PHP.
 *
 * @param {Array<{text: string, level: number, anchor: string}>} items Headings.
 * @returns {Array} Tree nodes with a `children` array each.
 */
export const buildTree = (items) => {
	const root = [];
	const levelStack = [];
	const listStack = [root];

	items.forEach((item) => {
		while (levelStack.length && levelStack[levelStack.length - 1] >= item.level) {
			levelStack.pop();
			listStack.pop();
		}

		const node = { ...item, children: [] };
		listStack[listStack.length - 1].push(node);
		levelStack.push(item.level);
		listStack.push(node.children);
	});

	return root;
};
