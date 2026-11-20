import { __ } from '@wordpress/i18n';
import { RichText, useBlockProps } from '@wordpress/block-editor';

const Edit = ({ attributes, setAttributes }) => {
	return (
		<div {...useBlockProps()}>
			<RichText
				tagName="span"
				value={attributes.text}
				allowedFormats={[]}
				placeholder={__('Featured In', 'pmp-theme')}
				onChange={(text) => setAttributes({ text })}
			/>
		</div>
	);
};

export default Edit;
