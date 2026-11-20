import { useBlockProps, RichText } from '@wordpress/block-editor';

const Save = ({ attributes }) => {
	const { headingTitle, headingTag, headingDesc, headingDescPosition, seperatorStyle } =
		attributes;

	return (
		<div {...useBlockProps.save()}>
			{headingDescPosition === 'above-heading' && (
				<RichText.Content tagName="p" className="pmp-heading-desc" value={headingDesc} />
			)}

			<RichText.Content
				tagName={headingTag}
				className="pmp-heading-title"
				value={headingTitle}
			/>

			{seperatorStyle !== 'none' && (
				<div className="separator-wrap">
					<div className={`separator separator-${seperatorStyle}`} />
				</div>
			)}

			{headingDescPosition === 'below-heading' && (
				<RichText.Content tagName="p" className="pmp-heading-desc" value={headingDesc} />
			)}
		</div>
	);
};

export default Save;
