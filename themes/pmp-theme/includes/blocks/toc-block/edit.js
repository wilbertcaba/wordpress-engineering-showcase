/* eslint-disable @wordpress/no-unsafe-wp-apis */

/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import {
	useBlockProps,
	RichText,
	InspectorControls,
	useSettings,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
	__experimentalGetGapCSSValue as getGapCSSValue,
	__experimentalSpacingSizesControl as SpacingSizesControl,
} from '@wordpress/block-editor';
import {
	Notice,
	PanelBody,
	ToggleControl,
	SelectControl,
	__experimentalUnitControl as UnitControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalBoxControl as BoxControl,
	__experimentalBorderBoxControl as BorderBoxControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import { RESERVED_IDS, createDedupe, getSlug, stripTags } from './slug';
import { borderToProps, boxToCSS, buildTree, radiusToCSS, scanHtmlHeadings } from './utils';
import ItemRadiusControl from './item-radius-control';
import SiteDefaultsPanel, { useItemDefaults, withItemDefaults } from './site-defaults';

const HEADING_TAG_OPTIONS = [
	{ label: 'H2', value: 'h2' },
	{ label: 'H3', value: 'h3' },
	{ label: 'H4', value: 'h4' },
	{ label: 'H5', value: 'h5' },
	{ label: 'H6', value: 'h6' },
	{ label: __('Paragraph', 'pmp-theme'), value: 'p' },
];

const OFFSET_UNITS = [
	{ value: 'px', label: 'px', default: 150 },
	{ value: 'rem', label: 'rem', default: 8 },
	{ value: 'em', label: 'em', default: 8 },
];

/**
 * Placeholder shown when the current canvas has no matching headings,
 * which is always the case inside a template part.
 */
const PLACEHOLDER_TREE = [
	{
		text: __('Add headings to your content to generate a table of contents.', 'pmp-theme'),
		level: 2,
		anchor: 'toc-placeholder-1',
		children: [
			{
				text: __('Nested headings are indented like this.', 'pmp-theme'),
				level: 3,
				anchor: 'toc-placeholder-2',
				children: [],
			},
		],
	},
];

/**
 * Stop anchor navigation inside the editor canvas.
 *
 * @param {Event} event Click event.
 * @returns {void}
 */
const preventNavigation = (event) => event.preventDefault();

/**
 * Nested list renderer shared by real and placeholder trees.
 *
 * @param {object}      props              Component props.
 * @param {Array}       props.nodes        Tree nodes.
 * @param {string|null} props.activeAnchor Anchor to preview as active.
 * @param {boolean}     props.isPlaceholder Whether this is the placeholder list.
 * @returns {JSX.Element} List markup.
 */
const List = ({ nodes, activeAnchor, isPlaceholder = false }) => (
	<ul
		className={classnames('toc-block__list', {
			'toc-block__list--placeholder': isPlaceholder,
		})}
	>
		{nodes.map((node) => {
			const hasActiveChild =
				activeAnchor && node.children.some((child) => child.anchor === activeAnchor);

			return (
				<li
					key={node.anchor}
					className={classnames('toc-block__item', `toc-block__item--level-${node.level}`, {
						'is-active': node.anchor === activeAnchor,
						'has-active-child': hasActiveChild,
					})}
				>
					<a
						className="toc-block__link"
						href={`#${node.anchor}`}
						onClick={preventNavigation}
						aria-current={node.anchor === activeAnchor ? 'location' : undefined}
					>
						{node.text}
					</a>
					{node.children.length > 0 && (
						<List nodes={node.children} activeAnchor={activeAnchor} isPlaceholder={isPlaceholder} />
					)}
				</li>
			);
		})}
	</ul>
);

const Edit = ({ attributes, setAttributes, clientId }) => {
	const {
		title,
		headingTag,
		showTitle,
		includeH2,
		includeH3,
		includeH4,
		includeH5,
		includeH6,
		placement,
		scrollSpy,
		stickyDesktop,
		stickyTop,
		scrollOffset,
		itemGap,
		itemPadding,
		itemRadius,
		itemBorder,
		itemBackground,
		activeBorderColor,
		activeBackground,
		activeColor,
		style: blockStyle,
	} = attributes;

	// Inside a Sticky group the group sticks; this block's own sticky is ignored.
	const insideStickyGroup = useSelect(
		(select) => {
			const { getBlockParents, getBlock } = select('core/block-editor');

			return getBlockParents(clientId).some((parentId) => {
				const parent = getBlock(parentId);

				return parent && parent.name === 'core/group' && !!parent.attributes.pmpSticky;
			});
		},
		[clientId],
	);

	const includedLevels = [
		includeH2 && 2,
		includeH3 && 3,
		includeH4 && 4,
		includeH5 && 5,
		includeH6 && 6,
	].filter(Boolean);

	/**
	 * Every heading on the canvas in document order, scoped to the post
	 * content block when one exists (site editor). Heading blocks are read
	 * directly; Classic and Custom HTML blocks are scanned for plain headings,
	 * matching the PHP fallback. All levels are walked so the dedupe suffixes
	 * match the PHP side, then filtered below.
	 */
	const allHeadings = useSelect((select) => {
		const {
			getClientIdsWithDescendants,
			getBlockName,
			getBlockAttributes,
			getBlockParentsByBlockName,
			getBlocksByName,
		} = select('core/block-editor');

		const hasPostContent = getBlocksByName('core/post-content').length > 0;
		const dedupe = createDedupe(RESERVED_IDS);
		const found = [];

		/**
		 * Register or generate an anchor and record the heading.
		 *
		 * @param {string} text           Plain text.
		 * @param {number} level          Heading level.
		 * @param {string} existingAnchor Saved anchor or id, if any.
		 */
		const push = (text, level, existingAnchor) => {
			if (!text) {
				return;
			}

			let anchor = existingAnchor || '';

			if (anchor) {
				dedupe.reserve(anchor);
			} else {
				anchor = dedupe.next(getSlug(text));
			}

			if (anchor) {
				found.push({ text, level, anchor });
			}
		};

		getClientIdsWithDescendants().forEach((blockClientId) => {
			const name = getBlockName(blockClientId);

			if (name !== 'core/heading' && name !== 'core/freeform' && name !== 'core/html') {
				return;
			}

			if (
				hasPostContent &&
				getBlockParentsByBlockName(blockClientId, 'core/post-content').length === 0
			) {
				return;
			}

			const blockAttributes = getBlockAttributes(blockClientId) || {};

			if (name === 'core/heading') {
				push(
					stripTags(blockAttributes.content),
					blockAttributes.level ?? 2,
					blockAttributes.anchor,
				);
				return;
			}

			scanHtmlHeadings(String(blockAttributes.content ?? '')).forEach((heading) => {
				push(stripTags(heading.html), heading.level, heading.id);
			});
		});

		return found;
	}, []);

	const headings = allHeadings.filter((heading) => includedLevels.includes(heading.level));
	const tree = buildTree(headings);
	const hasHeadings = tree.length > 0;

	const isDesktopInstance = placement !== 'mobile';
	const showActivePreview = scrollSpy && isDesktopInstance;
	const previewTree = hasHeadings ? tree : PLACEHOLDER_TREE;
	const activeAnchor = showActivePreview ? previewTree[0]?.anchor : null;

	// Custom properties mirrored by TocBlock::custom_properties() in PHP.
	// Instance values sit on top of the site-wide defaults; `style.spacing.blockGap`
	// is read for instances saved before the Item Spacing control existed.
	const itemDefaults = useItemDefaults();
	const effective = withItemDefaults(attributes, itemDefaults);
	const legacyGap = blockStyle?.spacing?.blockGap;
	const rawGap =
		effective.itemGap || (legacyGap && typeof legacyGap === 'object' ? legacyGap.top : legacyGap);
	const gap = getGapCSSValue(rawGap, '');
	const itemPaddingCSS = boxToCSS(effective.itemPadding);
	const itemRadiusCSS = radiusToCSS(effective.itemRadius);
	const itemBorderProps = borderToProps(effective.itemBorder, effective.activeBorderColor);
	const customProperties = { ...itemBorderProps };

	if (gap) {
		customProperties['--toc-item-gap'] = gap;
	}
	if (itemPaddingCSS) {
		customProperties['--toc-item-padding'] = itemPaddingCSS;
	}
	if (itemRadiusCSS) {
		customProperties['--toc-item-radius'] = itemRadiusCSS;
	}
	if (effective.itemBackground) {
		customProperties['--toc-item-bg'] = effective.itemBackground;
	}
	if (effective.activeBackground) {
		customProperties['--toc-active-bg'] = effective.activeBackground;
	}
	if (effective.activeColor) {
		customProperties['--toc-active-color'] = effective.activeColor;
	}

	const blockProps = useBlockProps({
		className: classnames('toc-block', `toc-block--${placement}`, {
			'toc-block--sticky': stickyDesktop && isDesktopInstance,
			'toc-block--scrollspy': showActivePreview,
		}),
		style: customProperties,
	});

	const colorGradientSettings = useMultipleOriginColorsAndGradients();
	const [spacingSizes, spacingUnits] = useSettings('spacing.spacingSizes', 'spacing.units');
	const units = useCustomUnits({ availableUnits: spacingUnits || ['px', 'em', 'rem', '%'] });

	const TitleTag = headingTag;
	const navLabel = stripTags(title) || __('Table of Contents', 'pmp-theme');

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Title', 'pmp-theme')}>
					<ToggleControl
						label={__('Show title', 'pmp-theme')}
						checked={showTitle}
						onChange={(value) => setAttributes({ showTitle: value })}
					/>
					<SelectControl
						label={__('Title tag', 'pmp-theme')}
						value={headingTag}
						options={HEADING_TAG_OPTIONS}
						onChange={(value) => setAttributes({ headingTag: value })}
						disabled={!showTitle}
					/>
				</PanelBody>

				<PanelBody title={__('Placement', 'pmp-theme')}>
					<SelectControl
						label={__('Show on', 'pmp-theme')}
						value={placement}
						options={[
							{ label: __('Always', 'pmp-theme'), value: 'always' },
							{ label: __('Desktop only', 'pmp-theme'), value: 'desktop' },
							{ label: __('Mobile only', 'pmp-theme'), value: 'mobile' },
						]}
						onChange={(value) => setAttributes({ placement: value })}
						help={__(
							'Desktop is 782px and wider, the width at which the sidebar column stacks. Use Desktop only in the sidebar and Mobile only for a copy placed inside the content.',
							'pmp-theme',
						)}
					/>
					<ToggleControl
						label={__('Collapsible', 'pmp-theme')}
						help={__(
							'Starts closed behind its title. For a copy placed inside the content; not used when sticky.',
							'pmp-theme',
						)}
						checked={!!attributes.collapsible}
						onChange={(value) => setAttributes({ collapsible: value })}
					/>
					<ToggleControl
						label={__('Sticky on desktop', 'pmp-theme')}
						checked={stickyDesktop}
						disabled={!isDesktopInstance}
						onChange={(value) => setAttributes({ stickyDesktop: value })}
						help={
							isDesktopInstance
								? __('Keeps the list in view below the sticky header.', 'pmp-theme')
								: __('Not available for Mobile only.', 'pmp-theme')
						}
					/>
					{stickyDesktop && insideStickyGroup && (
						<Notice status="info" isDismissible={false}>
							{__(
								'This block is inside a Sticky group, so it moves with the group and its own Sticky setting is ignored.',
								'pmp-theme',
							)}
						</Notice>
					)}
					{stickyDesktop && isDesktopInstance && (
						<UnitControl
							__next40pxDefaultSize
							label={__('Sticky top offset', 'pmp-theme')}
							value={stickyTop}
							units={OFFSET_UNITS}
							min={0}
							onChange={(value) => setAttributes({ stickyTop: value || '' })}
							help={__(
								'Distance from the top of the viewport while stuck. Leave empty to follow the measured sticky header height.',
								'pmp-theme',
							)}
						/>
					)}
					<ToggleControl
						label={__('Highlight current section while scrolling', 'pmp-theme')}
						checked={scrollSpy}
						disabled={!isDesktopInstance}
						onChange={(value) => setAttributes({ scrollSpy: value })}
						help={
							isDesktopInstance
								? __(
										'The first item is shown highlighted here so the active style can be adjusted.',
										'pmp-theme',
								)
								: __('Not available for Mobile only.', 'pmp-theme')
						}
					/>
				</PanelBody>

				<PanelBody title={__('Include Heading Levels', 'pmp-theme')}>
					<ToggleControl
						label={__('Include H2', 'pmp-theme')}
						checked={includeH2}
						onChange={(value) => setAttributes({ includeH2: value })}
					/>
					<ToggleControl
						label={__('Include H3', 'pmp-theme')}
						checked={includeH3}
						onChange={(value) => setAttributes({ includeH3: value })}
					/>
					<ToggleControl
						label={__('Include H4', 'pmp-theme')}
						checked={includeH4}
						onChange={(value) => setAttributes({ includeH4: value })}
					/>
					<ToggleControl
						label={__('Include H5', 'pmp-theme')}
						checked={includeH5}
						onChange={(value) => setAttributes({ includeH5: value })}
					/>
					<ToggleControl
						label={__('Include H6', 'pmp-theme')}
						checked={includeH6}
						onChange={(value) => setAttributes({ includeH6: value })}
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<ToolsPanel
					label={__('List Items', 'pmp-theme')}
					panelId={clientId}
					resetAll={(filters) =>
						setAttributes(filters.reduce((acc, filter) => ({ ...acc, ...filter({}) }), {}))
					}
				>
					<ColorGradientSettingsDropdown
						__experimentalIsRenderedInSidebar
						panelId={clientId}
						settings={[
							{
								label: __('Item background', 'pmp-theme'),
								colorValue: itemBackground,
								onColorChange: (value) => setAttributes({ itemBackground: value || '' }),
								resetAllFilter: () => ({ itemBackground: '' }),
								clearable: true,
								enableAlpha: true,
								isShownByDefault: true,
							},
							{
								label: __('Active item background', 'pmp-theme'),
								colorValue: activeBackground,
								onColorChange: (value) => setAttributes({ activeBackground: value || '' }),
								resetAllFilter: () => ({ activeBackground: '' }),
								clearable: true,
								enableAlpha: true,
								isShownByDefault: true,
							},
							{
								label: __('Active link', 'pmp-theme'),
								colorValue: activeColor,
								onColorChange: (value) => setAttributes({ activeColor: value || '' }),
								resetAllFilter: () => ({ activeColor: '' }),
								clearable: true,
								enableAlpha: true,
								isShownByDefault: true,
							},
							{
								label: __('Active item border', 'pmp-theme'),
								colorValue: activeBorderColor,
								onColorChange: (value) => setAttributes({ activeBorderColor: value || '' }),
								resetAllFilter: () => ({ activeBorderColor: '' }),
								clearable: true,
								enableAlpha: true,
								isShownByDefault: true,
							},
						]}
						{...colorGradientSettings}
						gradients={[]}
						disableCustomGradients
					/>
					<ToolsPanelItem
						panelId={clientId}
						label={__('Item Spacing', 'pmp-theme')}
						hasValue={() => Boolean(itemGap)}
						onDeselect={() => setAttributes({ itemGap: '' })}
						resetAllFilter={() => ({ itemGap: '' })}
						isShownByDefault
						className="tools-panel-item-spacing"
					>
						{spacingSizes?.length ? (
							<SpacingSizesControl
								label={__('Item Spacing', 'pmp-theme')}
								min={0}
								values={{ top: itemGap || undefined }}
								onChange={(value) => setAttributes({ itemGap: value?.top || '' })}
								sides={['top']}
								showSideInLabel={false}
								allowReset={false}
							/>
						) : (
							<UnitControl
								__next40pxDefaultSize
								label={__('Item Spacing', 'pmp-theme')}
								min={0}
								value={itemGap}
								onChange={(value) => setAttributes({ itemGap: value || '' })}
							/>
						)}
					</ToolsPanelItem>
					<ToolsPanelItem
						panelId={clientId}
						label={__('Item Padding', 'pmp-theme')}
						hasValue={() => Boolean(boxToCSS(itemPadding))}
						onDeselect={() => setAttributes({ itemPadding: {} })}
						resetAllFilter={() => ({ itemPadding: {} })}
						isShownByDefault
					>
						{spacingSizes?.length ? (
							<SpacingSizesControl
								label={__('Item Padding', 'pmp-theme')}
								min={0}
								values={itemPadding}
								onChange={(value) => setAttributes({ itemPadding: value || {} })}
								sides={['top', 'right', 'bottom', 'left']}
								units={units}
								allowReset={false}
							/>
						) : (
							<BoxControl
								__next40pxDefaultSize
								label={__('Item Padding', 'pmp-theme')}
								values={itemPadding}
								onChange={(value) => setAttributes({ itemPadding: value || {} })}
								units={units}
								splitOnAxis={false}
								allowReset={false}
							/>
						)}
					</ToolsPanelItem>
					<ToolsPanelItem
						panelId={clientId}
						label={__('Item Border', 'pmp-theme')}
						hasValue={() => Object.keys(borderToProps(itemBorder)).length > 0}
						onDeselect={() => setAttributes({ itemBorder: {} })}
						resetAllFilter={() => ({ itemBorder: {} })}
						isShownByDefault
					>
						<BorderBoxControl
							__experimentalIsRenderedInSidebar
							__next40pxDefaultSize
							size="__unstable-large"
							popoverPlacement="left-start"
							popoverOffset={40}
							label={__('Item Border', 'pmp-theme')}
							colors={colorGradientSettings.colors}
							enableAlpha
							enableStyle
							value={itemBorder}
							onChange={(value) => setAttributes({ itemBorder: value || {} })}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						panelId={clientId}
						label={__('Item Radius', 'pmp-theme')}
						hasValue={() => Boolean(radiusToCSS(itemRadius))}
						onDeselect={() => setAttributes({ itemRadius: '' })}
						resetAllFilter={() => ({ itemRadius: '' })}
						isShownByDefault
					>
						<ItemRadiusControl
							label={__('Item Radius', 'pmp-theme')}
							value={itemRadius}
							onChange={(value) => setAttributes({ itemRadius: value })}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
				<SiteDefaultsPanel attributes={attributes} setAttributes={setAttributes} />
				<PanelBody title={__('Scroll Offset', 'pmp-theme')} initialOpen={false}>
					<UnitControl
						__next40pxDefaultSize
						label={__('Space kept above a heading when jumping to it', 'pmp-theme')}
						value={scrollOffset}
						units={OFFSET_UNITS}
						onChange={(value) => setAttributes({ scrollOffset: value || '' })}
						help={__('Leave empty to follow the sticky header height.', 'pmp-theme')}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				{showTitle && (
					<RichText
						tagName={TitleTag}
						className="toc-block__title"
						value={title}
						onChange={(value) => setAttributes({ title: value })}
						placeholder={__('Table of Contents', 'pmp-theme')}
						allowedFormats={[]}
						withoutInteractiveFormatting
					/>
				)}
				<nav className="toc-block__nav" aria-label={navLabel}>
					<List nodes={previewTree} activeAnchor={activeAnchor} isPlaceholder={!hasHeadings} />
				</nav>
			</div>
		</>
	);
};

export default Edit;
