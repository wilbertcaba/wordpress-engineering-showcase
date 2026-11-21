<?php
/** Real WordPress checks for the after-only Video Modal example. */
if ( ! defined( 'WP_CLI' ) ) { exit; }
$video_pages = get_posts( [ 'post_type' => 'page', 'meta_key' => '_showcase_key', 'meta_value' => 'video-modal-page', 'numberposts' => -1 ] );
showcase_assert( 1 === count( $video_pages ), 'Exactly one seeded Video Modal page' );
$video_media = get_posts( [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_showcase_key', 'meta_value' => 'video-modal-', 'meta_compare' => 'LIKE', 'numberposts' => -1 ] );
showcase_assert( 2 === count( $video_media ), 'Exactly two Video Modal fixtures' );
$modals = array_values( array_filter( parse_blocks( $video_pages[0]->post_content ), static fn( $block ) => 'pmp/video-modal' === $block['blockName'] ) );
showcase_assert( 2 === count( $modals ), 'Solid and outline modal examples saved' );
$html = do_blocks( $video_pages[0]->post_content );
showcase_assert( 2 === substr_count( $html, '<dialog ' ), 'Each instance has its own dialog' );
showcase_assert( ! str_contains( $html, '<video ' ) && ! str_contains( $html, '<iframe ' ), 'No player created in initial server markup' );
showcase_assert( str_contains( $html, 'is-style-outline' ) && str_contains( $html, '--pmp-video-modal-size:96px' ), 'Outline style and custom button size rendered' );
showcase_assert( str_contains( $html, '--pmp-video-modal-icon-size:55%' ) && str_contains( $html, 'aria-hidden="true"' ), 'Custom icon is decorative and sized independently' );
$empty = $modals[0]; $empty['attrs']['videoUrl'] = '';
showcase_assert( '' === trim( render_block( $empty ) ), 'Missing video URL renders no trigger' );
$escaped = $modals[0]; $escaped['attrs']['videoTitle'] = '" onfocus="alert(1)';
$escaped_html = render_block( $escaped );
$dom = new DOMDocument(); @$dom->loadHTML( $escaped_html );
foreach ( $dom->getElementsByTagName( '*' ) as $element ) {
    showcase_assert( ! $element->hasAttribute( 'onfocus' ), 'Video title remains escaped in ' . $element->tagName );
}
$type = WP_Block_Type_Registry::get_instance()->get_registered( 'pmp/video-modal' );
showcase_assert( 1 === count( $type->view_script_handles ), 'Video Modal registers a block view script' );
