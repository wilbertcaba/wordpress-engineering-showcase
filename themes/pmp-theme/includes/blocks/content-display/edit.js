// Showcase adapter: retain the grid wrapper without unrelated tabs/carousel UI.
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
export default function Edit() {
    return <div {...useBlockProps()}><InnerBlocks templateLock={false} /></div>;
}
