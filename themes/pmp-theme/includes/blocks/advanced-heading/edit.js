/* eslint-disable @wordpress/no-unsafe-wp-apis */
/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';

const Edit = ({ attributes, setAttributes, context }) => {
	const {
		headingTitle,
		headingTag,
		headingAlign,
		seperatorStyle,
		isDynamic,
		dynamicSource,
		sourceField,
		customField,
		customInput,
		customMetaKey,
		linkToPost,
	} = attributes;

	// Get post data for preview
	const postData = useSelect(
		(select) => {
			if (!isDynamic || !context.postId) return null;

			const post = select('core').getEditedEntityRecord(
				'postType',
				context.postType,
				context.postId,
			);

			// Also fetch post meta
			const meta = select('core').getEditedEntityRecord('postType', context.postType, context.postId)?.meta;

			return {
				...post,
				meta,
			};
		},
		[context.postId, isDynamic],
	);

	// Get taxonomy terms for this post
	const postTerms = useSelect(
		(select) => {
			if (
				!isDynamic ||
				!context.postId ||
				dynamicSource !== 'custom-meta' ||
				!customMetaKey
			) {
				return null;
			}

			// Get all taxonomies
			const taxonomies = select('core').getTaxonomies();
			if (!taxonomies) return null;

			// Check if our metaKey matches a taxonomy
			const matchingTaxonomy = taxonomies.find((tax) => tax.slug === customMetaKey);
			if (!matchingTaxonomy) return null;

			// Get terms for this post in this taxonomy
			return select('core').getEntityRecords('taxonomy', matchingTaxonomy.slug, {
				post: context.postId,
			});
		},
		[isDynamic, context.postId, dynamicSource, customMetaKey],
	);

	// Get ACF field value for the current post
	const acfFieldValue = useSelect(
		(select) => {
			if (!isDynamic || !context.postId || dynamicSource !== 'custom-field' || !customField) {
				return null;
			}

			const acfStore = select('acf');
			if (acfStore && typeof acfStore.getFieldValue === 'function') {
				// Try to get the field value using ACF's data store
				const value = acfStore.getFieldValue(context.postId, customField);
				if (value !== undefined && value !== null) {
					return value;
				}
			}

			// If ACF store doesn't work, try alternative methods
			// 1. Try core editor's meta data
			const meta = select('core').getEditedEntityRecord('postType', context.postType, context.postId)?.meta;
			if (meta && meta[customField] !== undefined) {
				return meta[customField];
			}

			// 2. Try ACF prefixed fields (ACF sometimes stores fields with 'acf_' prefix)
			if (meta && meta[`acf_${customField}`] !== undefined) {
				return meta[`acf_${customField}`];
			}

			// 3. Try core data from post entity record
			const post = select('core').getEditedEntityRecord(
				'postType',
				context.postType,
				context.postId,
			);

			// Check for ACF REST API format (acf property)
			if (post && post.acf && post.acf[customField] !== undefined) {
				return post.acf[customField];
			}

			// No value found through any method
			return null;
		},
		[isDynamic, context.postId, context.postType, dynamicSource, customField],
	);

	// Get available ACF custom fields for the current post type
	const customFields = useSelect(
		(select) => {
			// Check if ACF is available in the data store
			const acfStore = select('acf');
			if (!acfStore) {
				return [];
			}

			try {
				if (typeof acfStore.getFieldGroups === 'function') {
					const fieldGroups = acfStore.getFieldGroups();

					if (!fieldGroups || !fieldGroups.length) return [];

					const allFields = [];
					fieldGroups.forEach((group) => {
						if (typeof acfStore.getFieldsForFieldGroup === 'function') {
							const fields = acfStore.getFieldsForFieldGroup(group.key) || [];

							fields.forEach((field) => {
								allFields.push({
									label: field.label || field.name,
									value: field.name,
								});
							});
						}
					});

					return allFields;
				}
				return [];
			} catch (e) {
				return [];
			}
		},
		[context.postType],
	);


    // Query-loop instances share attributes. Compute a preview per post without
    // writing each post's title back into that shared block template.
    const previewContent = (() => {
        if (!isDynamic) return headingTitle;
        if (dynamicSource === 'custom-input') return customInput || '';
        if (dynamicSource === 'custom-field') return String(acfFieldValue ?? postData?.meta?.[customField] ?? '');
        if (dynamicSource === 'custom-meta') return String(postData?.meta?.[customMetaKey] ?? postTerms?.map((term) => term.name).join(', ') ?? '');
        const value = postData?.[sourceField];
        return typeof value === 'string' ? value : value?.rendered || '';
    })();

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Heading Settings', 'pmp-theme')}>
					<SelectControl
						label={__('Heading Level', 'pmp-theme')}
						value={headingTag}
						options={[
							{ label: 'H1', value: 'h1' },
							{ label: 'H2', value: 'h2' },
							{ label: 'H3', value: 'h3' },
							{ label: 'H4', value: 'h4' },
							{ label: 'H5', value: 'h5' },
							{ label: 'H6', value: 'h6' },
							{ label: 'Paragraph', value: 'p' },
						]}
						onChange={(value) => setAttributes({ headingTag: value })}
					/>
					<SelectControl
						label={__('Text Align', 'pmp-theme')}
						value={headingAlign}
						options={[
							{ label: 'Left', value: 'left' },
							{ label: 'Center', value: 'center' },
							{ label: 'Right', value: 'right' },
						]}
						onChange={(value) => setAttributes({ headingAlign: value })}
					/>
					<SelectControl
						label={__('Separator Style', 'pmp-theme')}
						value={seperatorStyle}
						options={[
							{ label: 'None', value: 'none' },
							{ label: 'Solid', value: 'solid' },
							{ label: 'Dotted', value: 'dotted' },
							{ label: 'Dashed', value: 'dashed' },
						]}
						onChange={(value) => setAttributes({ seperatorStyle: value })}
					/>
					<ToggleControl
						label={__('Link to Post', 'pmp-theme')}
						checked={!!linkToPost}
						onChange={(value) => setAttributes({ linkToPost: value })}
					/>
				</PanelBody>
				<PanelBody title={__('Dynamic Content', 'pmp-theme')}>
					<ToggleControl
						label={__('Use Dynamic Content', 'pmp-theme')}
						checked={isDynamic}
						onChange={(value) => setAttributes({ isDynamic: value })}
					/>

					{isDynamic && (
						<>
							<SelectControl
								label={__('Data Source', 'pmp-theme')}
								value={dynamicSource}
								options={[
									{
										label: __('Current Post', 'pmp-theme'),
										value: 'current-post',
									},
									{
										label: __('Custom Field', 'pmp-theme'),
										value: 'custom-field',
									},
									{
										label: __('Custom Input', 'pmp-theme'),
										value: 'custom-input',
									},
									{
										label: __('Taxonomy Key', 'pmp-theme'),
										value: 'custom-meta',
									},
								]}
								onChange={(value) => setAttributes({ dynamicSource: value })}
							/>

							{dynamicSource === 'current-post' && (
								<SelectControl
									label={__('Source Field', 'pmp-theme')}
									value={sourceField}
									options={[
										{ label: __('Title', 'pmp-theme'), value: 'title' },
										{ label: __('Excerpt', 'pmp-theme'), value: 'excerpt' },
									]}
									onChange={(value) => setAttributes({ sourceField: value })}
								/>
							)}

							{dynamicSource === 'custom-field' &&
								(customFields.length > 0 ? (
									<SelectControl
										label={__('Field Name', 'pmp-theme')}
										value={customField}
										options={[
											{
												label: __('Select a field', 'pmp-theme'),
												value: '',
											},
											...customFields,
										]}
										onChange={(value) => setAttributes({ customField: value })}
									/>
								) : (
									<TextControl
										label={__('Field Name', 'pmp-theme')}
										value={customField}
										onChange={(value) => setAttributes({ customField: value })}
										help={__('Enter the ACF field name manually', 'pmp-theme')}
									/>
								))}

							{dynamicSource === 'custom-input' && (
								<TextControl
									label={__('Custom Input', 'pmp-theme')}
									value={customInput}
									onChange={(value) => setAttributes({ customInput: value })}
								/>
							)}

							{dynamicSource === 'custom-meta' && (
								<TextControl
									label={__('Taxonomy Key', 'pmp-theme')}
									value={customMetaKey}
									onChange={(value) => setAttributes({ customMetaKey: value })}
									help={__('Enter the meta key to display', 'pmp-theme')}
								/>
							)}
						</>
					)}
				</PanelBody>
			</InspectorControls>

			<div {...useBlockProps({ className: `has-text-align-${headingAlign}` })}>
				<RichText
					tagName={headingTag}
					className="heading-text"
					value={previewContent}
					onChange={(content) => setAttributes({ headingTitle: content })}
					placeholder={__('Write heading...', 'pmp-theme')}
					disabled={isDynamic}
				/>

				{seperatorStyle !== 'none' && (
					<div className="separator-wrap">
						<div className={`separator separator-${seperatorStyle}`} />
					</div>
				)}
			</div>
		</>
	);
};

export default Edit;
