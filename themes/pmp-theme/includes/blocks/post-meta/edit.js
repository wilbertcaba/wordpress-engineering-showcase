/* eslint-disable @wordpress/no-unsafe-wp-apis */
/* eslint-disable @wordpress/no-unused-vars-before-return */
/**
 * External dependencies
 */
import classnames from 'classnames';
import { debounce } from 'lodash';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEntityProp, store as coreStore } from '@wordpress/core-data';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { MediaUpload, MediaUploadCheck, useBlockProps } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';

const ImageContent = ({ image }) => {
	if (image.loading) {
		return <div>Loading...</div>;
	}
	if (image?.source_url) {
		return (
			<img
				src={image.source_url}
				alt={image.alt_text || ''}
				className="wp-block-post-meta-image"
				style={{ width: '100%', height: 'auto' }}
			/>
		);
	}
	return <div>Error loading image</div>;
};

const ImageEditor = ({ blockProps, image, onSelectImage, onRemoveImage }) => {
	return (
		<div {...blockProps}>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={onSelectImage}
					allowedTypes={['image']}
					value={image?.id}
					render={({ open }) => (
						<div className="pmp-post-meta__image-wrapper">
							{image?.id ? (
								<>
									<ImageContent image={image} />
									<Button onClick={onRemoveImage} isDestructive variant="primary">
										{__('Remove Image', 'pmp')}
									</Button>
								</>
							) : (
								<Button onClick={open} variant="primary">
									{__('Select Image', 'pmp')}
								</Button>
							)}
						</div>
					)}
				/>
			</MediaUploadCheck>
		</div>
	);
};

const PostMetaEdit = ({ attributes, setAttributes, context }) => {
	const { textAlign, metaKey, isTitle, isImage } = attributes;
	const { postId, postType } = context;

	// All hooks must be at the top level, regardless of conditions
	const [meta, setMeta] = useEntityProp('postType', postType || 'post', 'meta', postId);
	const { saveEditedEntityRecord } = useDispatch(coreStore);

	const image = useSelect(
		(select) => {
			if (!meta || !metaKey || !meta[metaKey]) return null;

			const { getMedia, isResolving } = select('core');
			const mediaItem = getMedia(meta[metaKey]);
			const isLoading = isResolving('getMedia', [meta[metaKey]]);

			if (isLoading) {
				return { id: meta[metaKey], loading: true };
			}

			return mediaItem || null;
		},
		[meta, metaKey],
	);

	const props = useBlockProps({
		className: classnames({
			[`has-text-align-${textAlign}`]: textAlign,
			[`pmp-post-meta-${metaKey}`]: metaKey,
			[`wp-block-post-title`]: isTitle,
		}),
	});

	useEffect(() => {
		// Check if this is a card_image meta when component mounts
		if (meta && 'card_image' in meta) {
			setAttributes({
				metaKey: 'card_image',
				isImage: true,
			});
		}
	}, [meta, setAttributes]);

	// Return early if we don't have valid data
	if (!postId || !postType || !metaKey) {
		return null;
	}

	// Create debounced update function
	const updateValue = debounce((newValue) => {
		setMeta({ ...meta, [metaKey]: newValue });
		saveEditedEntityRecord('postType', postType, postId);
	}, 300);

	// Render image editor if in edit mode and isImage is true
	if (isImage) {
		return (
			<ImageEditor
				blockProps={props}
				image={image}
				onSelectImage={(media) => updateValue(media.id)}
				onRemoveImage={() => updateValue(0)}
			/>
		);
	}

	// For non-image meta fields, render the meta value
	return <div {...props}>{meta[metaKey]}</div>;
};

export default PostMetaEdit;
