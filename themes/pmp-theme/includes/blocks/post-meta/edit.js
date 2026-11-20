/* eslint-disable @wordpress/no-unsafe-wp-apis */
/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useEntityProp, store as coreStore } from '@wordpress/core-data';
import { useDispatch } from '@wordpress/data';
import { debounce } from '@wordpress/compose';
import { AlignmentControl, BlockControls, useBlockProps, RichText } from '@wordpress/block-editor';

const PostMetaEdit = ({ attributes, setAttributes, context }) => {
	const { textAlign, metaKey, isEditable, isTitle } = attributes;
	const { postId, postType } = context;

	const [meta, setMeta] = useEntityProp('postType', postType, 'meta', postId); // eslint-disable-line @wordpress/no-unused-vars-before-return
	const [rawTitle = ''] = useEntityProp('postType', postType, 'title', postId); // eslint-disable-line @wordpress/no-unused-vars-before-return
	const { saveEditedEntityRecord } = useDispatch(coreStore); // eslint-disable-line @wordpress/no-unused-vars-before-return

	if (!meta || !metaKey || !Object.prototype.hasOwnProperty.call(meta, metaKey)) {
		return null;
	}

	const metaValue = meta[metaKey];
	const updateMetaValue = debounce((newValue) => {
		setMeta({ ...meta, [metaKey]: newValue });

		// Save the changes
		saveEditedEntityRecord('postType', postType, postId);
	}, 300);

	// eslint-disable-next-line react-hooks/rules-of-hooks
	const blockProps = useBlockProps({
		className: classnames({
			[`has-text-align-${textAlign}`]: textAlign,
			[`pmp-post-meta-${metaKey}`]: metaKey,
			[`wp-block-post-title`]: isTitle,
		}),
	});

	return (
		<>
			<BlockControls group="block">
				<AlignmentControl
					value={textAlign}
					onChange={(nextAlign) => {
						setAttributes({ textAlign: nextAlign });
					}}
				/>
			</BlockControls>
			<div {...blockProps}>
				{isEditable && (
					<RichText
						tagName="span"
						value={metaValue !== '' ? metaValue : rawTitle}
						onChange={(newValue) => {
							updateMetaValue(newValue);
						}}
						placeholder={sprintf(__("Add '%s' value", 'pmp-theme'), metaKey)}
						allowedFormats={[]}
						withoutInteractiveFormatting
					/>
				)}

				{
					!isEditable && <>{metaValue}</> // eslint-disable-line react/jsx-no-useless-fragment
				}
			</div>
		</>
	);
};

export default PostMetaEdit;
