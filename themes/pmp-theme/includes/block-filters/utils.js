/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { store as blocksStore } from '@wordpress/blocks';

/**
 * Hook that returns the query properties' names defined by the active
 * block variation, to determine which block's filters to show.
 *
 * @param {object} attributes Block attributes.
 * @returns {string[]} An array of the query attributes.
 */
export function useAllowedControls(attributes) {
	return useSelect(
		(select) =>
			select(blocksStore).getActiveBlockVariation('core/query', attributes)?.allowedControls,
		[attributes],
	);
}

export function isControlAllowed(allowedControls, key) {
	// Every controls is allowed if the list is not defined.
	if (!allowedControls) {
		return true;
	}
	return allowedControls.includes(key);
}

/**
 * Hook that returns the taxonomies associated with a specific post type.
 *
 * @param {string} postType The post type from which to retrieve the associated taxonomies.
 * @returns {object[]} An array of the associated taxonomies.
 */
export const useTaxonomies = (postType) => {
	const taxonomies = useSelect(
		(select) => {
			const { getTaxonomies } = select(coreStore);
			const filteredTaxonomies = getTaxonomies({
				type: postType,
				per_page: -1,
				context: 'view',
			});
			return filteredTaxonomies;
		},
		[postType],
	);
	return taxonomies;
};

/**
 * Remove block within array of block templates
 *
 * @param {string} blockName Block to remove.
 * @param {string[]} template Block template.
 * @param {string[]} hasAttribute Attribute to check.
 * @param {string[]} attributeValue Attribute value.
 * @returns {string[]} An array of new blocks.
 */
export function removeBlockByName(blockName, template, hasAttribute = '', attributeValue = '') {
	const filtered = [];

	if (Array.isArray(template)) {
		template.map((item) => {
			if (Array.isArray(item)) {
				if (!item.includes(blockName) && item[2] !== undefined) {
					const innerBlocks = removeBlockByName(blockName, item[2]);
					filtered.push([item[0], item[1], innerBlocks]);
				} else if (!item.includes(blockName)) {
					const checkAttributes =
						item[1] !== undefined && item[1][hasAttribute] !== undefined
							? item[1][hasAttribute] === attributeValue
							: false;
					if (!checkAttributes) {
						filtered.push(item);
					}
				}
			}
			return filtered;
		});
	}

	return filtered;
}

/**
 * Update block attributes within innerBlocks by block name
 *
 * @param {string} blockName Block to remove.
 * @param {string[]} template Block template.
 * @param {object[]} attributes Block attributes to update.
 * @returns {string[]} An array of new blocks.
 */
export function updateAttributesBlockByName(blockName, template, attributes) {
	const filtered = [];

	if (Array.isArray(template)) {
		template.map((item) => {
			if (Array.isArray(item)) {
				if (!item.includes(blockName) && item[2] !== undefined) {
					const innerBlocks = updateAttributesBlockByName(blockName, item[2]);
					filtered.push([item[0], item[1], innerBlocks]);
				} else if (!item.includes(blockName)) {
					filtered.push(item);
				} else {
					if (item[1] !== undefined) {
						item[1] = Object.assign(item[1], attributes);
					}
					filtered.push(item);
				}
			}
			return filtered;
		});
	}

	return filtered;
}
