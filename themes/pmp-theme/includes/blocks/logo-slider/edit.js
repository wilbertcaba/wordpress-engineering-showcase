import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { InnerBlocks, InspectorControls, useBlockProps, store } from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';

const TEMPLATE = [['core/image'], ['core/image'], ['core/image']];

const Edit = ({ attributes, setAttributes, clientId }) => {
	const { scrollSpeed, logoWidth, logoHeight, logoGap, autoWidth } = attributes;
	const hasLabel = useSelect(
		(select) =>
			select(store)
				.getBlocks(clientId)
				.some(({ name }) => name === 'pmp/logo-slider-label'),
		[clientId],
	);
	const blockProps = useBlockProps({
		className: autoWidth ? 'has-auto-width' : undefined,
		style: {
			'--logo-slider-width': `${logoWidth}px`,
			'--logo-slider-height': `${logoHeight}px`,
			'--logo-slider-gap': `${logoGap}px`,
		},
	});
	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Logo slider settings', 'pmp-theme')}>
					<RangeControl
						label={__('Scroll speed', 'pmp-theme')}
						value={scrollSpeed}
						min={0.1}
						max={5}
						step={0.1}
						onChange={(value) => setAttributes({ scrollSpeed: value })}
					/>
					<ToggleControl
						label={__('Automatic logo width', 'pmp-theme')}
						help={__(
							'Size each logo from its aspect ratio and the chosen height.',
							'pmp-theme',
						)}
						checked={autoWidth}
						onChange={(value) => setAttributes({ autoWidth: value })}
					/>
					{!autoWidth && (
						<RangeControl
							label={__('Logo width (px)', 'pmp-theme')}
							value={logoWidth}
							min={80}
							max={400}
							onChange={(value) => setAttributes({ logoWidth: value })}
						/>
					)}
					<RangeControl
						label={__('Logo height (px)', 'pmp-theme')}
						value={logoHeight}
						min={24}
						max={160}
						onChange={(value) => setAttributes({ logoHeight: value })}
					/>
					<RangeControl
						label={__('Gap between logos (px)', 'pmp-theme')}
						value={logoGap}
						min={0}
						max={160}
						onChange={(value) => setAttributes({ logoGap: value })}
					/>
					<p>
						{__(
							'Add Image blocks for logos. Add a Logo Slider Label for an optional overlay, then set its color or gradient in Styles. The editor stays still so logos are easy to edit.',
							'pmp-theme',
						)}
					</p>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<InnerBlocks
					template={TEMPLATE}
					allowedBlocks={
						hasLabel ? ['core/image'] : ['core/image', 'pmp/logo-slider-label']
					}
					orientation="horizontal"
				/>
			</div>
		</>
	);
};

export default Edit;
