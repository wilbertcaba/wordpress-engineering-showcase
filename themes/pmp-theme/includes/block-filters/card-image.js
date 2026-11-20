import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { useSelect, useDispatch } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';

const CardImagePanel = () => {
	const { editPost } = useDispatch('core/editor'); // eslint-disable-line @wordpress/no-unused-vars-before-return
	const meta = useSelect((select) => select('core/editor').getEditedPostAttribute('meta')); // eslint-disable-line @wordpress/no-unused-vars-before-return
	const cardImageId = meta?.card_image || 0;
	const postType = useSelect((select) => select('core/editor').getCurrentPostType(), []);

	// Always call hooks in the same order — use meta-derived id in dependency array
	const media = useSelect(
		(select) => (cardImageId ? select('core').getMedia(cardImageId) : null),
		[cardImageId],
	);

	if (postType !== 'pmp_practice_area' || !meta) {
		return null;
	}

	const onCustomMetaChange = (meta_key, meta_value) => {
		editPost({
			meta: { ...meta, [meta_key]: meta_value },
		});
	};

	const imageUrl = () => {
		if (!media) {
			return '';
		}

		const mediaDetails = media.media_details;
		if (mediaDetails && mediaDetails.sizes) {
			const { sizes } = mediaDetails;
			if (sizes.thumbnail) {
				return sizes.thumbnail.source_url;
			}
			if (sizes.medium) {
				return sizes.medium.source_url;
			}
		}
		return media.source_url || '';
	};

	return (
		<PluginDocumentSettingPanel
			name="pmp-card-image-panel"
			title={__('Card Image', 'pmp-theme')}
			className="pmp-card-image-panel"
		>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={(mediaItem) => onCustomMetaChange('card_image', mediaItem.id)}
					allowedTypes={['image']}
					value={cardImageId}
					render={({ open }) => (
						<>
							{cardImageId && imageUrl() ? (
								<div style={{ marginBottom: 8 }}>
									<img src={imageUrl()} alt="" style={{ maxWidth: '100%', height: 'auto' }} />
								</div>
							) : null}
							<Button variant="primary" onClick={open}>
								{cardImageId ? __('Replace image', 'pmp-theme') : __('Select image', 'pmp-theme')}
							</Button>
							{cardImageId ? (
								<Button
									variant="tertiary"
									icon="no"
									label={__('Remove image', 'pmp-theme')}
									onClick={() => onCustomMetaChange('card_image', 0)}
								/>
							) : null}
						</>
					)}
				/>
			</MediaUploadCheck>
		</PluginDocumentSettingPanel>
	);
};

registerPlugin('pmp-card-image-panel', {
	render: CardImagePanel,
});
