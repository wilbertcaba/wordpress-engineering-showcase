/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import block from './block.json';
import edit from './edit';
import save from './save';

/**
 * Register block
 */
registerBlockType(block, {
	edit,
	save,
});
