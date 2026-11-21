/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import { TextControl, Button, PanelBody, PanelRow, RangeControl } from '@wordpress/components';

const DefaultPlayIcon = () => (
	<svg
		aria-hidden="true"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
	>
		<path d="M8 5.14v13.72L19 12 8 5.14Z" />
	</svg>
);

const VideoModalBlockEdit = ({ attributes, setAttributes }) => {
	const { videoUrl, videoTitle, buttonSize, iconId, iconUrl, iconSize } = attributes;
	const blockProps = useBlockProps({
		className: classnames({
			'is-missing-url': !videoUrl,
		}),
		style: {
			'--pmp-video-modal-size': buttonSize ? `${buttonSize}px` : undefined,
			'--pmp-video-modal-icon-size': iconSize ? `${iconSize}%` : undefined,
		},
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Video Modal Settings', 'pmp-theme')} initialOpen>
					<PanelRow>
						<TextControl
							label={__('Video URL', 'pmp-theme')}
							help={__('YouTube, Vimeo, or a direct video file URL.', 'pmp-theme')}
							placeholder={__('https://…', 'pmp-theme')}
							value={videoUrl}
							onChange={(value) => setAttributes({ videoUrl: value })}
						/>
					</PanelRow>
					<PanelRow>
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={['video']}
								onSelect={(media) => setAttributes({ videoUrl: media.url })}
								render={({ open }) => (
									<Button variant="secondary" onClick={open}>
										{__('Select from Media Library', 'pmp-theme')}
									</Button>
								)}
							/>
						</MediaUploadCheck>
					</PanelRow>
					<PanelRow>
						<TextControl
							label={__('Video title', 'pmp-theme')}
							help={__('Describes the video for screen readers.', 'pmp-theme')}
							value={videoTitle}
							onChange={(value) => setAttributes({ videoTitle: value })}
						/>
					</PanelRow>
				</PanelBody>
				<PanelBody title={__('Button', 'pmp-theme')} initialOpen={false}>
					<RangeControl
						label={__('Button size (px)', 'pmp-theme')}
						value={buttonSize}
						onChange={(value) => setAttributes({ buttonSize: value })}
						min={40}
						max={200}
						initialPosition={72}
						allowReset
					/>
					<RangeControl
						label={__('Icon size (% of button)', 'pmp-theme')}
						value={iconSize}
						onChange={(value) => setAttributes({ iconSize: value })}
						min={20}
						max={90}
						initialPosition={45}
						allowReset
					/>
					<MediaUploadCheck>
						<MediaUpload
							allowedTypes={['image']}
							value={iconId}
							onSelect={(media) =>
								setAttributes({ iconId: media.id, iconUrl: media.url })
							}
							render={({ open }) => (
								<PanelRow>
									<Button variant="secondary" onClick={open}>
										{iconUrl
											? __('Replace icon', 'pmp-theme')
											: __('Custom icon from Media Library', 'pmp-theme')}
									</Button>
									{iconUrl && (
										<Button
											variant="tertiary"
											isDestructive
											onClick={() =>
												setAttributes({
													iconId: undefined,
													iconUrl: '',
												})
											}
										>
											{__('Reset to play icon', 'pmp-theme')}
										</Button>
									)}
								</PanelRow>
							)}
						/>
					</MediaUploadCheck>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<span className="wp-block-pmp-video-modal__trigger">
					{iconUrl ? <img src={iconUrl} alt="" /> : <DefaultPlayIcon />}
				</span>
			</div>
		</>
	);
};

export default VideoModalBlockEdit;
