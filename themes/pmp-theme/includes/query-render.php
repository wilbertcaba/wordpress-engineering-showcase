<?php
/**
 * Extracted from PMP\Theme\Block\QueryBlock::render_block (10up/PMP contributors).
 * Adapter: register only the render filter; return updated HTML explicitly.
 */
add_filter( 'render_block_core/query', static function ( $block_content, $block ) {
    $attributes = $block['attrs'];
    $processor = new WP_HTML_Tag_Processor( $block_content );
    while ( $processor->next_tag( [ 'class_name' => 'wp-block-pmp-content-card-template' ] ) ) {
        if ( isset( $attributes['variationName'] ) ) {
            $processor->add_class( 'variation-' . sanitize_key( $attributes['variationName'] ) );
        }
        if ( empty( $attributes['showMore'] ) ) {
            $processor->add_class( 'read-more-hidden' );
        }
    }
    return $processor->get_updated_html();
}, 10, 2 );
