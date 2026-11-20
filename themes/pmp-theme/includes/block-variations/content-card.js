/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { registerBlockVariation } from '@wordpress/blocks';

const CONTENT_CARD_VARIATION_NAME = 'pmp/content-card-variation';
const ASYMMETRICAL_GRID_VARIATION_NAME = 'pmp/asymmetrical-grid-variation';

registerBlockVariation('core/query', {
	name: CONTENT_CARD_VARIATION_NAME,
	title: __('Content Card', 'pmp-theme'),
	description: __(
		'The Content Card block offers content editors a versatile tool for showcasing specific posts with flexible visual customization. ',
		'pmp-theme',
	),
	icon: 'screenoptions',
	isActive: ['namespace'],
	attributes: {
		namespace: CONTENT_CARD_VARIATION_NAME,
		query: {
			postType: 'post',
			perPage: 1,
			inherit: false,
		},
	},
	allowedControls: ['postType', 'postPicker', 'layoutControls'],
	scope: ['inserter'],
	innerBlocks: [
		[
			'core/post-template',
			{
				layout: {
					type: 'grid',
					columns: 1,
					columnCount: 1,
				},
			},
			[['pmp/content-card-template']],
		],
	],
	providesContext: { showPostTitle: 'showPostTitle' },
});

registerBlockVariation('core/query', {
	name: ASYMMETRICAL_GRID_VARIATION_NAME,
	title: __('Asymmetrical Grid', 'pmp-theme'),
	description: __(
		'The Asymmetrical Grid block offers content editors a versatile tool for showcasing posts in an asymmetrical grid.',
		'pmp-theme',
	),
	icon: 'layout',
	isActive: ['namespace'],
	attributes: {
		namespace: ASYMMETRICAL_GRID_VARIATION_NAME,
		query: {
			postType: 'post',
			perPage: 10,
			inherit: false,
		},
	},
	allowedControls: ['postPicker', 'postTypeCustomControl'],
	scope: ['inserter'],
	innerBlocks: [
		[
			'core/post-template',
			{
				layout: {
					type: 'grid',
					columns: 1,
					columnCount: 1,
				},
				asymmetricalGrid: true,
			},
			[['pmp/content-card-template']],
		],
	],
});
