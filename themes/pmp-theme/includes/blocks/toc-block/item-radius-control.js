/* eslint-disable @wordpress/no-unsafe-wp-apis */

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSettings } from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	Flex,
	FlexItem,
	__experimentalGrid as Grid,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';
import { link, linkOff } from '@wordpress/icons';

const CORNERS = [
	['topLeft', __('Top left', 'pmp-theme')],
	['topRight', __('Top right', 'pmp-theme')],
	['bottomLeft', __('Bottom left', 'pmp-theme')],
	['bottomRight', __('Bottom right', 'pmp-theme')],
];

const DEFAULT_UNITS = ['px', 'em', 'rem', '%'];

/**
 * Border radius control with a custom label.
 *
 * Core's BorderRadiusControl hardcodes its "Radius" legend, so this mirrors
 * its behaviour: one field while corners are linked, four fields when not.
 * The value is a CSS length string when linked and a per-corner object when
 * unlinked, matching what radiusToCSS() and TocBlock::radius_css_value() read.
 *
 * @param {object}        props          Component props.
 * @param {string}        props.label    Visible label.
 * @param {string|object} props.value    Current value.
 * @param {Function}      props.onChange Change handler.
 * @returns {JSX.Element} Control.
 */
const ItemRadiusControl = ({ label, value, onChange }) => {
	const isObject = Boolean(value) && typeof value === 'object';
	const [isLinked, setIsLinked] = useState(!isObject);

	const [availableUnits] = useSettings('spacing.units');
	const units = useCustomUnits({ availableUnits: availableUnits || DEFAULT_UNITS });

	/**
	 * Switch between one shared value and four corner values.
	 */
	const toggleLinked = () => {
		if (isLinked) {
			const shared = typeof value === 'string' ? value : '';
			onChange(shared ? Object.fromEntries(CORNERS.map(([corner]) => [corner, shared])) : '');
		} else {
			const first = isObject ? Object.values(value).find(Boolean) : '';
			onChange(first || '');
		}

		setIsLinked(!isLinked);
	};

	/**
	 * Update one corner, dropping the object when every corner is empty.
	 *
	 * @param {string} corner Corner key.
	 * @param {string} next   New value.
	 */
	const onCornerChange = (corner, next) => {
		const merged = { ...(isObject ? value : {}), [corner]: next || undefined };
		const hasAny = Object.values(merged).some(Boolean);
		onChange(hasAny ? merged : '');
	};

	return (
		<fieldset className="toc-item-radius-control">
			<BaseControl.VisualLabel as="legend">{label}</BaseControl.VisualLabel>
			<Flex align="flex-start" gap={2}>
				<FlexItem isBlock>
					{isLinked ? (
						<UnitControl
							__next40pxDefaultSize
							aria-label={label}
							value={typeof value === 'string' ? value : ''}
							units={units}
							min={0}
							onChange={(next) => onChange(next || '')}
						/>
					) : (
						<Grid columns={2} gap={2}>
							{CORNERS.map(([corner, cornerLabel]) => (
								<UnitControl
									__next40pxDefaultSize
									key={corner}
									aria-label={`${label}: ${cornerLabel}`}
									value={(isObject && value[corner]) || ''}
									units={units}
									min={0}
									onChange={(next) => onCornerChange(corner, next)}
								/>
							))}
						</Grid>
					)}
				</FlexItem>
				<Button
					size="compact"
					icon={isLinked ? link : linkOff}
					label={
						isLinked
							? __('Unlink corners', 'pmp-theme')
							: __('Link corners', 'pmp-theme')
					}
					isPressed={!isLinked}
					onClick={toggleLinked}
				/>
			</Flex>
		</fieldset>
	);
};

export default ItemRadiusControl;
