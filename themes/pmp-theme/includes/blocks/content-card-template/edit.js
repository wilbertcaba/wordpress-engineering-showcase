/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import { useBlockProps, InnerBlocks, store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { removeBlockByName, updateAttributesBlockByName } from '../../block-filters/utils';

/**
 * Define block templateg
 */
const DEFAULT_TEMPLATE = [
	['core/post-featured-image', { sizeSlug: 'large' }],
	[
		'pmp/post-meta',
		{
			metaKey: 'card_image',
			isImage: true,
			sizeSlug: 'large',
		},
	],
	['core/post-terms', { term: 'category' }],
	['core/post-title', { isLink: true }],
	[
		'pmp/post-meta',
		{
			metaKey: 'title_secondary',
			isEditable: true,
			isTitle: true,
			isLink: true,
			textColor: 'secondary',
			style: {
				typography: {
					fontWeight: 'var:custom|font-weight|medium',
					fontSize: 'var:preset|font-size|medium',
				},
				elements: {
					link: {
						color: {
							text: 'var:preset|color|secondary',
						},
					},
				},
			},
		},
	],
	['core/post-excerpt', { showMoreOnNewLine: false }],
	[
		'core/group',
		{ className: 'wp-block-pmp-content-card-template__post-meta' },
		[['core/post-date', { format: 'd.M.Y' }], ['core/post-author-name'], ['pmp/post-time-to-read']],
	],
];

const COVER_TEMPLATE = [
	['core/post-featured-image', { sizeSlug: 'large' }],
	['core/post-terms', { term: 'category' }],
	['core/post-title', { isLink: true }],
	[
		'pmp/post-meta',
		{
			metaKey: 'title_secondary',
			isEditable: true,
			isTitle: true,
			isLink: true,
			textColor: 'secondary',
			style: {
				typography: {
					fontWeight: 'var:custom|font-weight|medium',
					fontSize: 'var:preset|font-size|large',
				},
				elements: {
					link: {
						color: {
							text: 'var:preset|color|secondary',
						},
					},
				},
			},
		},
	],
];

const HORIZONTAL_TEMPLATE = [
	[
		'core/columns',
		{},
		[
			['core/column', {}, [['core/post-featured-image', { sizeSlug: 'large' }]]],
			[
				'core/column',
				{},
				[
					['core/post-terms', { term: 'category' }],
					['core/post-title', { isLink: true }],
					[
						'pmp/post-meta',
						{
							metaKey: 'title_secondary',
							isEditable: true,
							isTitle: true,
							isLink: true,
							textColor: 'secondary',
							style: {
								typography: {
									fontWeight: 'var:custom|font-weight|medium',
									fontSize: 'var:preset|font-size|medium',
								},
								elements: {
									link: {
										color: {
											text: 'var:preset|color|secondary',
										},
									},
								},
							},
						},
					],
					['core/post-excerpt', { showMoreOnNewLine: false }],
					[
						'core/group',
						{ className: 'wp-block-pmp-content-card-template__post-meta' },
						[
							['core/post-date', { format: 'd.M.Y' }],
							['core/post-author-name'],
							['pmp/post-time-to-read'],
						],
					],
				],
			],
		],
	],
];

const HORIZONTAL_NO_IMAGE_TEMPLATE = [
	[
		'core/columns',
		{},
		[
			[
				'core/column',
				{},
				[
					['core/post-terms', { term: 'category' }],
					['core/post-title', { isLink: true }],
					[
						'pmp/post-meta',
						{
							metaKey: 'title_secondary',
							isEditable: true,
							isTitle: true,
							isLink: true,
							textColor: 'secondary',
							style: {
								typography: {
									fontWeight: 'var:custom|font-weight|medium',
									fontSize: 'var:preset|font-size|large',
								},
								elements: {
									link: {
										color: {
											text: 'var:preset|color|secondary',
										},
									},
								},
							},
						},
					],
					[
						'core/group',
						{ className: 'wp-block-pmp-content-card-template__post-meta' },
						[
							['core/post-date', { format: 'd.M.Y' }],
							['core/post-author-name'],
							['pmp/post-time-to-read'],
						],
					],
				],
			],
			[
				'core/column',
				{},
				[
					[
						'core/post-excerpt',
						{
							style: {
								typography: {
									lineHeight: '1.4',
									fontSize: '1.13rem',
								},
							},
							showMoreOnNewLine: true,
						},
					],
					[
						'core/button',
						{
							className: 'is-style-arrow',
							text: __('Get in touch', 'pmp-theme'),
						},
					],
				],
			],
		],
	],
];

/**
 * Edit component.
 * See https://wordpress.org/gutenberg/handbook/designers-developers/developers/block-api/block-edit-save/#edit
 *
 * @param {object}   props                  The block props.
 * @param {object}   props.attributes       Block attributes.
 * @param {string}   props.attributes.title Custom title to be displayed.
 * @param {string}   props.className        Class name for the block.
 * @param {Function} props.setAttributes    Sets the value for block attributes.
 * @returns {Function} Render the edit screen
 */
const ContentCardBlockEdit = (props) => {
	const { context, clientId } = props;
	const {
		postType,
		displayVariationName,
		showPostTitle,
		useSecondaryTitle,
		variationName,
		showFeaturedImage,
		showCardImage,
		showPostExcerpt,
		showPostAuthor,
		showPostDate,
		showReadingTime,
		showTaxonomy,
		showMore,
	} = context;
	let variationClassName = `variation-${variationName}`;

	const blockProps = useBlockProps();

	let template = DEFAULT_TEMPLATE;
	if (variationName === 'cover') {
		template = COVER_TEMPLATE;
	}

	if (variationName === 'horizontally-stacked') {
		template = HORIZONTAL_TEMPLATE;
	}

	if (variationName === 'horizontally-stacked-no-image') {
		template = HORIZONTAL_NO_IMAGE_TEMPLATE;
	}

	blockProps.className += ` ${variationClassName}`;

	// Handle Featured Image and Card Image for Practice Areas
	if (postType === 'pmp_practice_area') {
		const wantsCardImage = showCardImage !== false;
		const wantsFeaturedImage = showFeaturedImage !== false;
		if (wantsCardImage) {
			// When card image is preferred, drop featured image and ensure card image exists
			template = removeBlockByName('core/post-featured-image', template);

			const hasCardImage = template.some(
				([name, attrs]) => name === 'pmp/post-meta' && attrs?.metaKey === 'card_image',
			);

			if (!hasCardImage) {
				template.unshift([
					'pmp/post-meta',
					{
						metaKey: 'card_image',
						isImage: true,
						sizeSlug: 'large',
					},
				]);
			}
		} else {
			// When card image is explicitly disabled, remove it and respect featured image toggle
			template = removeBlockByName('pmp/post-meta', template, { metaKey: 'card_image' });
			if (!wantsFeaturedImage) {
				template = removeBlockByName('core/post-featured-image', template);
			} else {
				const hasFeaturedImage = template.some(([name]) => name === 'core/post-featured-image');
				if (!hasFeaturedImage) {
					template.unshift(['core/post-featured-image', { sizeSlug: 'large' }]);
				}
			}
		}
	} else {
		// For non-practice areas, always remove card image and handle featured image
		template = removeBlockByName('pmp/post-meta', template, { metaKey: 'card_image' });
		if (showFeaturedImage === false) {
			template = removeBlockByName('core/post-featured-image', template);
		}
	}

	// Hide Post Title
	if (useSecondaryTitle || (showPostTitle !== undefined && !showPostTitle)) {
		template = removeBlockByName('core/post-title', template);
	}

	// Hide Post Title
	if (!useSecondaryTitle) {
		template = removeBlockByName('pmp/post-meta', template, 'isTitle', true);
	}

	// Hide Post Excerpt
	if (showPostExcerpt !== undefined && !showPostExcerpt) {
		template = removeBlockByName('core/post-excerpt', template);
	}

	// Hide Post Author
	if (showPostAuthor !== undefined && !showPostAuthor) {
		template = removeBlockByName('core/post-author-name', template);
	}

	// Hide Post Date
	if (showPostDate !== undefined && !showPostDate) {
		template = removeBlockByName('core/post-date', template);
	}

	// Hide Reading Time
	if (showReadingTime !== undefined && !showReadingTime) {
		template = removeBlockByName('pmp/post-time-to-read', template);
	}

	// Hide Primary Taxonomy
	if (showTaxonomy !== undefined && !showTaxonomy) {
		template = removeBlockByName('core/post-terms', template);

		if (postType === 'pmp_lawyer') {
			template = removeBlockByName('core/paragraph', template);
		}
	}

	// Hide More Button
	if ((showMore !== undefined && !showMore) || showMore === undefined) {
		template = removeBlockByName('core/buttons', template);
		template = removeBlockByName('core/read-more', template);

		blockProps.className += ' read-more-hidden';
	} else {
		blockProps.className.replace(' read-more-hidden', '');
	}

	// Hide Group Block
	if (
		showPostDate !== undefined &&
		!showPostDate &&
		showReadingTime !== undefined &&
		!showReadingTime &&
		showPostAuthor !== undefined &&
		!showPostAuthor
	) {
		template = removeBlockByName('core/group', template);
	}

	if (displayVariationName === 'accordion') {
		template = updateAttributesBlockByName('core/post-excerpt', template, {
			showMoreOnNewLine: true,
			moreText: __('Read more', 'pmp-theme'),
		});

		template = [
			['core/details', { summary: '', className: 'content-display-accordion-item' }, template],
		];
	}

	const { replaceInnerBlocks } = useDispatch(blockEditorStore);
	const currentInnerBlocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId],
	);
	useEffect(() => {
		if (postType !== 'pmp_practice_area') return;
		const isImageBlock = (block) =>
			block.name === 'core/post-featured-image' ||
			(block.name === 'pmp/post-meta' && block.attributes.metaKey === 'card_image');
		const imageBlocks = currentInnerBlocks.filter(isImageBlock);
		const wantsCard = showCardImage !== false;
		const desiredName = wantsCard
			? 'pmp/post-meta'
			: showFeaturedImage !== false
			? 'core/post-featured-image'
			: null;
		if (
			(!desiredName && imageBlocks.length === 0) ||
			(imageBlocks.length === 1 && imageBlocks[0].name === desiredName)
		)
			return;
		const existing = imageBlocks.find((block) => block.name === desiredName);
		const imageAttributes = wantsCard
			? { metaKey: 'card_image', isImage: true, sizeSlug: 'large' }
			: { sizeSlug: 'large' };
		const image = desiredName ? existing || createBlock(desiredName, imageAttributes) : null;
		// One atomic replacement avoids overlapping async remove/insert operations.
		replaceInnerBlocks(
			clientId,
			[...(image ? [image] : []), ...currentInnerBlocks.filter((block) => !isImageBlock(block))],
			false,
		);
	}, [
		showCardImage,
		showFeaturedImage,
		postType,
		clientId,
		currentInnerBlocks,
		replaceInnerBlocks,
	]);

	// Define allowed blocks
	const ALLOWED_BLOCKS = [
		'core/post-featured-image',
		'core/post-title',
		'core/post-excerpt',
		'core/post-terms',
		'core/buttons',
		'core/button',
		'core/read-more',
		'core/group',
		'core/column',
		'core/columns',
		'core/paragraph',
		'core/post-author-name',
		'core/post-date',
		'pmp/post-meta',
		'pmp/advanced-heading',
		'pmp/post-time-to-read',
		'core/post-content',
		'core/details',
	];

	return (
		<div {...blockProps}>
			<InnerBlocks
				template={template}
				orientation="horizontal"
				templateLock={false} // Allow full editing capabilities
				allowedBlocks={ALLOWED_BLOCKS}
				// renderAppender
			/>
		</div>
	);
};
export default ContentCardBlockEdit;
