<?php
/** Real WordPress rendering checks for the after-only Logo Slider. */
if ( ! defined( 'WP_CLI' ) ) { exit; }
$logo_pages = get_posts( [ 'post_type' => 'page', 'meta_key' => '_showcase_key', 'meta_value' => 'logo-slider-page', 'numberposts' => -1 ] );
showcase_assert( 1 === count( $logo_pages ), 'Exactly one seeded Logo Slider page' );
$logo_images = get_posts( [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_showcase_key', 'meta_value' => 'logo-slider-', 'meta_compare' => 'LIKE', 'numberposts' => -1 ] );
showcase_assert( 6 === count( $logo_images ), 'Exactly six fictional logo attachments' );
$sliders = array_values( array_filter( parse_blocks( $logo_pages[0]->post_content ), static fn( $block ) => 'pmp/logo-slider' === $block['blockName'] ) );
showcase_assert( 2 === count( $sliders ), 'Fixed-width and automatic-width examples saved' );
showcase_assert( false === ( $sliders[0]['attrs']['autoWidth'] ?? false ) && true === ( $sliders[1]['attrs']['autoWidth'] ?? false ), 'Both width modes represented' );
$html = do_blocks( $logo_pages[0]->post_content );
showcase_assert( 12 === substr_count( $html, 'class="splide__slide"' ), 'Both sliders render six original slides' );
showcase_assert( 1 === substr_count( $html, '<span>Demo brands</span>' ), 'Optional label rendered exactly once' );
showcase_assert( str_contains( $html, 'Fictional Alpha demo logo' ), 'Logo alternative text preserved' );
showcase_assert( str_contains( $html, 'href="#logo-alpha"' ), 'Logo links preserved' );
$bounded = $sliders[0];
$bounded['attrs'] = [ 'logoWidth' => -100, 'logoHeight' => 999, 'logoGap' => 999, 'scrollSpeed' => -4 ];
$bounded_html = render_block( $bounded );
foreach ( ['--logo-slider-width:80px', '--logo-slider-height:160px', '--logo-slider-gap:160px', 'data-scroll-speed="0.1"'] as $expected ) {
    showcase_assert( str_contains( $bounded_html, $expected ), 'Server clamps setting: ' . $expected );
}
$type = WP_Block_Type_Registry::get_instance()->get_registered( 'pmp/logo-slider' );
showcase_assert( 1 === count( $type->view_script_handles ), 'Slider JavaScript registered as a block view script' );
