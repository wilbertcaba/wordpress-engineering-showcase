import { RichText, useBlockProps } from '@wordpress/block-editor';

const Save = ({ attributes }) => {
	return (
		<div {...useBlockProps.save()}>
			<RichText.Content tagName="span" value={attributes.text} />
		</div>
	);
};

export default Save;
