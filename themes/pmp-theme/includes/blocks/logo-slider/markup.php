<?php
/**
 * Logo ticker markup.
 *
 * @package PMP
 * @var array $attributes Block attributes.
 * @var WP_Block $block Block instance.
 */

$logo_width  = max( 80, min( 400, (int) ( $attributes['logoWidth'] ?? 200 ) ) );
$logo_height = max( 24, min( 160, (int) ( $attributes['logoHeight'] ?? 64 ) ) );
$logo_gap    = max( 0, min( 160, (int) ( $attributes['logoGap'] ?? 64 ) ) );
$speed       = max( 0.1, min( 5, (float) ( $attributes['scrollSpeed'] ?? 1 ) ) );
$wrapper     = get_block_wrapper_attributes(
	array(
		'class'             => ! empty( $attributes['autoWidth'] ) ? 'splide has-auto-width' : 'splide',
		'style'             => sprintf( '--logo-slider-width:%dpx;--logo-slider-height:%dpx;--logo-slider-gap:%dpx;', $logo_width, $logo_height, $logo_gap ),
		'data-scroll-speed' => $speed,
		'aria-label'        => __( 'Featured logos', 'pmp-theme' ),
	)
);
$logos       = '';
$label       = '';
foreach ( $block->inner_blocks as $inner_block ) {
	if ( 'core/image' === $inner_block->name ) {
		$logos .= '<li class="splide__slide">' . $inner_block->render() . '</li>';
	} elseif ( 'pmp/logo-slider-label' === $inner_block->name && '' === $label ) {
		$label = $inner_block->render();
	}
}
?>
<div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php echo $label; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered block content. ?>
	<div class="splide__track">
		<ul class="splide__list">
			<?php echo $logos; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered block content. ?>
		</ul>
	</div>
</div>
