<?php
/** Focused extraction of the breadcrumb label helper. */
namespace PMP\Theme;
function strip_breadcrumb_shortcodes( $label ) {
	if ( ! is_string( $label ) || false === strpos( $label, '[' ) ) {
		return $label;
	}

	$stripped = strip_shortcodes( $label );

	if ( $stripped === $label ) {
		return $label;
	}

	$stripped = preg_replace( '/\s+([,.;:!?])/', '$1', $stripped );
	$stripped = preg_replace( '/\s{2,}/', ' ', $stripped );
	$stripped = trim( $stripped, " \t\n\r\0\x0B,;:-" );

	// A title that was nothing but a shortcode keeps its original text.
	return '' === $stripped ? $label : $stripped;
}
