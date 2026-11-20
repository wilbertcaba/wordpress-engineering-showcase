import { registerBlockExtension } from '@10up/block-components';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import { useAllowedControls } from './utils';

/**
 * additional block attributes object
 */
const additionalAttributes = {
	variationName: {
		type: 'string',
		default: 'vertically-stacked',
	},
	caseResultOrderBy: {
		type: 'string',
		default: 'date',
	},
	caseResultOrder: {
		type: 'string',
		default: 'desc',
	},
	showPostTitle: {
		type: 'boolean',
		default: true,
	},
	useSecondaryTitle: {
		type: 'boolean',
		default: false,
	},
	showFeaturedImage: {
		type: 'boolean',
		default: true,
	},
	showPostExcerpt: {
		type: 'boolean',
		default: true,
	},
	showPostAuthor: {
		type: 'boolean',
		default: true,
	},
	showPostDate: {
		type: 'boolean',
		default: true,
	},
	showReadingTime: {
		type: 'boolean',
		default: true,
	},
	showTaxonomy: {
		type: 'boolean',
		default: true,
	},
	showMore: {
		type: 'boolean',
		default: true,
	},
};
/**
 * BlockEdit
 *
 * a react component that will get mounted in the Editor when the block is
 * selected. It is recommended to use Slots like `BlockControls` or `InspectorControls`
 * in here to put settings into the blocks toolbar or sidebar.
 *
 * @param {object} props block props
 * @returns {string}
 */
const BlockEdit = (props) => {
	const { attributes, setAttributes } = props;
	const {
		variationName,
		caseResultOrderBy,
		caseResultOrder,
		showPostTitle,
		useSecondaryTitle,
		showFeaturedImage,
		showPostExcerpt,
		showPostAuthor,
		showPostDate,
		showReadingTime,
		showTaxonomy,
		showMore,
		query,
	} = attributes;

	const { postType } = query;

	const allowedControls = useAllowedControls(attributes);

	// Bail early if not defined
	if (!allowedControls) {
		return null;
	}

	const displayControls = [];

	if (allowedControls.includes('postTypeCustomControl')) {
		displayControls.push(
			<SelectControl
				label={__('Post Type', 'pmp-theme')}
				help={__(
					'WordPress contains different types of content and they are divided into collections called "Post types". By default there are a few different ones such as blog posts and pages, but plugins could add more.',
					'pmp-theme',
				)}
				value={postType}
				options={[
					{ label: __('Post', 'pmp-theme'), value: 'post' },
					{ label: __('Testimonial', 'pmp-theme'), value: 'pmp_testimonial' },
					{ label: __('Case Result', 'pmp-theme'), value: 'pmp_case_result' },
				]}
				onChange={(selectedPostType) => {
					setAttributes({
						query: {
							...query,
							postType: selectedPostType,
						},
					});
				}}
			/>,
		);
	}

	if (allowedControls.includes('postType')) {
		if (['pmp_case_result'].includes(postType)) {
			displayControls.push(
				<SelectControl
					label={__('Order By', 'pmp-theme')}
					value={caseResultOrderBy}
					options={[
						{ label: __('Amount', 'pmp-theme'), value: 'amount' },
						{ label: __('Date', 'pmp-theme'), value: 'date' },
						{ label: __('Title', 'pmp-theme'), value: 'title' },
					]}
					onChange={(selectedOrderBy) => {
						setAttributes({
							query: {
								...query,
								orderBy: selectedOrderBy,
							},
							caseResultOrderBy: selectedOrderBy,
						});
					}}
				/>,
			);

			displayControls.push(
				<SelectControl
					label={__('Order', 'pmp-theme')}
					value={caseResultOrder}
					options={[
						{ label: __('ASC', 'pmp-theme'), value: 'asc' },
						{ label: __('DESC', 'pmp-theme'), value: 'desc' },
					]}
					onChange={(selectedOrder) => {
						setAttributes({
							query: {
								...query,
								order: selectedOrder,
							},
							caseResultOrder: selectedOrder,
						});
					}}
				/>,
			);
		}
	}

	if (allowedControls.includes('layoutControls')) {
		// Variation Control.
		if (!['pmp_lawyer', 'pmp_testimonial'].includes(postType)) {
			displayControls.push(
				<SelectControl
					label={__('Variation', 'pmp-theme')}
					value={variationName}
					options={[
						{
							label: __('Vertically Stacked(default)', 'pmp-theme'),
							value: 'vertically-stacked',
						},
						{ label: __('Cover', 'pmp-theme'), value: 'cover' },
						{
							label: __(
								'Vertically Stacked + No Image + Center Aligned',
								'pmp-theme',
							),
							value: 'vertically-stacked-no-image-centered',
						},
						{
							label: __('Horizontally Stacked', 'pmp-theme'),
							value: 'horizontally-stacked',
						},
						{
							label: __('Horizontally Stacked + No Image', 'pmp-theme'),
							value: 'horizontally-stacked-no-image',
						},
					]}
					onChange={(value) => {
						const defaultAttributes = {
							variationName: value,
							showPostTitle: true,
							showFeaturedImage: true,
							showPostExcerpt: true,
							showPostAuthor: true,
							showPostDate: true,
							showReadingTime: true,
							showTaxonomy: true,
						};
						if (value === 'cover') {
							setAttributes({
								...defaultAttributes,
								showPostExcerpt: false,
								showPostAuthor: false,
								showPostDate: false,
								showReadingTime: false,
							});
						} else if (value === 'vertically-stacked-no-image-centered') {
							setAttributes({
								...defaultAttributes,
								showFeaturedImage: false,
								showReadingTime: false,
							});
						} else if (value === 'horizontally-stacked') {
							if (['pmp_case_result'].includes(postType)) {
								setAttributes({
									...defaultAttributes,
									showPostExcerpt: false,
									showTaxonomy: false,
								});
							} else {
								setAttributes({ ...defaultAttributes, showPostExcerpt: false });
							}
						} else if (value === 'horizontally-stacked-no-image') {
							setAttributes({
								...defaultAttributes,
								showFeaturedImage: false,
								showTaxonomy: false,
							});
						} else {
							setAttributes(defaultAttributes);
						}
					}}
				/>,
			);
		}

		// Title Control.
		if (!['pmp_testimonial'].includes(postType)) {
			displayControls.push(
				<ToggleControl
					label={__('Show Title', 'pmp-theme')}
					help={
						showPostTitle
							? __('Has title displayed.', 'pmp-theme')
							: __('Has title hidden.', 'pmp-theme')
					}
					checked={showPostTitle}
					onChange={(value) => {
						setAttributes({ showPostTitle: value });
					}}
				/>,
			);

			displayControls.push(
				<ToggleControl
					label={__('Use Alternative Card Title', 'pmp-theme')}
					help={
						useSecondaryTitle
							? __('Has card title displayed.', 'pmp-theme')
							: __('Has card title hidden.', 'pmp-theme')
					}
					checked={useSecondaryTitle}
					onChange={(value) => {
						setAttributes({ showPostTitle: !value, useSecondaryTitle: value });
					}}
				/>,
			);
		}
		// Featured Image Control.
		if (
			!['vertically-stacked-no-image-centered', 'horizontally-stacked-no-image'].includes(
				variationName,
			) &&
			!['pmp_testimonial'].includes(postType)
		) {
			displayControls.push(
				<ToggleControl
					label={__('Show Featured Image', 'pmp-theme')}
					help={
						showFeaturedImage
							? __('Has featured image displayed.', 'pmp-theme')
							: __('Has featured image hidden.', 'pmp-theme')
					}
					checked={showFeaturedImage}
					onChange={(value) => {
						setAttributes({ showFeaturedImage: value });
					}}
				/>,
			);
		}

		// Excerpt Control.
		if (!['pmp_testimonial'].includes(postType)) {
			displayControls.push(
				<ToggleControl
					label={__('Show Excerpt', 'pmp-theme')}
					help={
						showPostExcerpt
							? __('Has excerpt displayed.', 'pmp-theme')
							: __('Has excerpt hidden.', 'pmp-theme')
					}
					checked={showPostExcerpt}
					onChange={(value) => {
						setAttributes({ showPostExcerpt: value });
					}}
				/>,
			);
		}

		// Author, Date and Reading Time Controls.
		if (!['pmp_lawyer', 'pmp_case_result', 'pmp_testimonial'].includes(postType)) {
			displayControls.push(
				<ToggleControl
					label={__('Show Author', 'pmp-theme')}
					help={
						showPostAuthor
							? __('Has author displayed.', 'pmp-theme')
							: __('Has author hidden.', 'pmp-theme')
					}
					checked={showPostAuthor}
					onChange={(value) => {
						setAttributes({ showPostAuthor: value });
					}}
				/>,
			);

			displayControls.push(
				<ToggleControl
					label={__('Show Date', 'pmp-theme')}
					help={
						showPostDate
							? __('Has date displayed.', 'pmp-theme')
							: __('Has date hidden.', 'pmp-theme')
					}
					checked={showPostDate}
					onChange={(value) => {
						setAttributes({ showPostDate: value });
					}}
				/>,
			);

			displayControls.push(
				<ToggleControl
					label={__('Show Reading Time', 'pmp-theme')}
					help={
						showReadingTime
							? __('Has reading time displayed.', 'pmp-theme')
							: __('Has reading time hidden.', 'pmp-theme')
					}
					checked={showReadingTime}
					onChange={(value) => {
						setAttributes({ showReadingTime: value });
					}}
				/>,
			);
		}

		// Category Control.
		displayControls.push(
			<ToggleControl
				label={__('Show Category', 'pmp-theme')}
				help={
					showTaxonomy
						? __('Has primary taxonomy displayed.', 'pmp-theme')
						: __('Has primary taxonomy hidden.', 'pmp-theme')
				}
				checked={showTaxonomy}
				onChange={(value) => {
					setAttributes({ showTaxonomy: value });
				}}
			/>,
		);

		// Show More Control.
		displayControls.push(
			<ToggleControl
				label={__('Show More', 'pmp-theme')}
				help={
					showMore
						? __('Has more button displayed.', 'pmp-theme')
						: __('Has more button hidden.', 'pmp-theme')
				}
				checked={showMore}
				onChange={(value) => {
					setAttributes({ showMore: value });
				}}
			/>,
		);
	}

	if (displayControls.length < 1) {
		return null;
	}

	return (
		<InspectorControls>
			<PanelBody title={__('Display Settings', 'pmp-theme')}>{displayControls}</PanelBody>
		</InspectorControls>
	);
};

/**
 * Add custom context to Query Block
 *
 * @param {object} settings Block Settings
 * @param {string} name     Block Name
 */

const providesContext = (settings, name) => {
	if (name === 'core/query') {
		settings.providesContext = {
			...settings.providesContext,
			variationName: 'variationName',
			showPostTitle: 'showPostTitle',
			useSecondaryTitle: 'useSecondaryTitle',
			showFeaturedImage: 'showFeaturedImage',
			showPostExcerpt: 'showPostExcerpt',
			showPostAuthor: 'showPostAuthor',
			showPostDate: 'showPostDate',
			showReadingTime: 'showReadingTime',
			showTaxonomy: 'showTaxonomy',
			showMore: 'showMore',
		};
	}

	return settings;
};
addFilter('blocks.registerBlockType', 'pmp/query/provides-context', providesContext);

registerBlockExtension('core/query', {
	extensionName: 'content-card-controls',
	attributes: additionalAttributes,
	Edit: BlockEdit,
	classNameGenerator: () => null,
});
