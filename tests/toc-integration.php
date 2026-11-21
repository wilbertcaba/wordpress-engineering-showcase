<?php
/** TOC integration checks in the disposable showcase site. */
use PMP\Theme\Block\TocBlock;
$module = new TocBlock();
$classic_ids = get_posts( [ 'post_type' => 'page', 'meta_key' => '_showcase_key', 'meta_value' => 'toc-table-of-contents-classic', 'fields' => 'ids' ] );
showcase_assert( 1 === count( $classic_ids ), 'One owned classic-content guide' );
showcase_assert( str_contains( get_post( $classic_ids[0] )->post_content, 'is-style-rail' ), 'Classic example uses Rail style' );
$ids = get_posts( [ 'post_type' => 'page', 'meta_key' => '_showcase_key', 'meta_value' => 'toc-table-of-contents', 'fields' => 'ids' ] );
showcase_assert( 1 === count( $ids ), 'One owned TOC guide' );
$used = TocBlock::reserved_ids();
$raw = '<h2>Café &amp; answers</h2><h3>Repeated</h3><h3>Repeated</h3><h2 id="manual">Saved</h2><h4>Skipped level</h4>';
$headings = TocBlock::collect_headings( parse_blocks( $raw ), $used );
showcase_assert( [ 'cafe-answers', 'repeated', 'repeated-1', 'manual', 'skipped-level' ] === array_column( $headings, 'anchor' ), 'Classic anchors deterministic with accents, duplicates and manual IDs' );
$rendered = $module->add_heading_ids( $raw );
foreach ( $headings as $heading ) { showcase_assert( str_contains( $rendered, 'id="' . $heading['anchor'] . '"' ), 'Rendered heading matches link: ' . $heading['anchor'] ); }
showcase_assert( [ 0, 1, 1, 0, 1 ] === TocBlock::assign_depths( $headings ), 'Skipped levels nest one step' );
showcase_assert( ! str_contains( $module->add_heading_ids( '<h2 class="toc-block__title">Table of Contents</h2>' ), 'id=' ), 'TOC title excluded from ID pass' );
showcase_assert( '' === TocBlock::length_css_value( '1px;color:red' ), 'CSS length injection rejected' );
showcase_assert( '' === TocBlock::color_css_value( 'red;background:url(https://example.com)' ), 'CSS color injection rejected' );
showcase_assert( 'h2' === TocBlock::title_tag( 'script' ), 'Invalid title tag falls back safely' );
showcase_assert( ! str_contains( TocBlock::render_list( [ [ 'level' => 2, 'anchor' => '" onclick="bad', 'text' => '<script>bad</script>' ] ] ), '<script>' ), 'Heading labels escaped' );
$option = TocBlock::DEFAULTS_OPTION;
$previous = get_option( $option, null );
try {
    wp_set_current_user( 0 );
    $request = new WP_REST_Request( 'POST', '/wp/v2/settings' );
    $request->set_param( $option, [ 'itemGap' => '12px' ] );
    showcase_assert( rest_do_request( $request )->get_status() >= 400, 'Anonymous shared-style write rejected' );
    $editor = get_users( [ 'role' => 'editor', 'number' => 1 ] );
    // A temporary user is removed below; no production account is reused or changed.
    $created = false;
    if ( ! $editor ) { $uid = wp_insert_user( [ 'user_login' => 'showcase-toc-test-editor', 'user_pass' => wp_generate_password(), 'role' => 'editor' ] ); $created = true; } else { $uid = $editor[0]->ID; }
    wp_set_current_user( $uid );
    showcase_assert( rest_do_request( $request )->get_status() >= 400, 'Editor cannot change site-wide defaults' );
    wp_set_current_user( get_users( [ 'role' => 'administrator', 'number' => 1 ] )[0]->ID );
    showcase_assert( 200 === rest_do_request( $request )->get_status(), 'Administrator can save shared styles through REST' );
    showcase_assert( '12px' === TocBlock::with_item_defaults( [] )['itemGap'], 'Shared defaults inherited' );
    showcase_assert( '0' === TocBlock::with_item_defaults( [ 'itemGap' => '0' ] )['itemGap'], 'Explicit zero overrides shared spacing' );
    $clean = $module->sanitize_item_defaults( [ 'unknown' => 'bad', 'itemGap' => '<b>12px</b>', 'itemPadding' => [ 'left' => '8px' ] ] );
    showcase_assert( ! isset( $clean['unknown'] ) && '12px' === $clean['itemGap'], 'Shared defaults whitelist and text sanitization' );
} finally {
    if ( null === $previous ) { delete_option( $option ); } else { update_option( $option, $previous ); }
    if ( ! empty( $created ) ) { require_once ABSPATH . 'wp-admin/includes/user.php'; wp_delete_user( $uid ); }
    wp_set_current_user( 0 );
}
// Exercise automatic insertion with a real singular main query, then restore global context.
$old_query = $GLOBALS['wp_query']; $old_main = $GLOBALS['wp_the_query']; $old_post = $GLOBALS['post'] ?? null;
$enable = static function () { return true; };
try {
    $q = new WP_Query( [ 'page_id' => $ids[0] ] );
    $GLOBALS['wp_query'] = $GLOBALS['wp_the_query'] = $q; $q->the_post();
    add_filter( 'pmp_theme_toc_auto_insert', $enable );
    $block_content = '<!-- wp:heading --><h2 class="wp-block-heading">Auto heading</h2><!-- /wp:heading -->';
    showcase_assert( str_contains( $module->maybe_insert_mobile_toc( $block_content ), '<!-- wp:pmp/toc-block' ), 'Auto-insert handles heading blocks' );
    $module->maybe_insert_mobile_toc( $raw );
    showcase_assert( str_contains( $module->insert_mobile_toc_html( $raw ), 'table-of-contents-mobile' ), 'Auto-insert handles classic HTML' );
    $existing = '<!-- wp:pmp/toc-block /-->' . $block_content;
    showcase_assert( $existing === $module->maybe_insert_mobile_toc( $existing ), 'Auto-insert preserves explicit TOC' );
} finally {
    remove_filter( 'pmp_theme_toc_auto_insert', $enable );
    $GLOBALS['wp_query'] = $old_query; $GLOBALS['wp_the_query'] = $old_main; $GLOBALS['post'] = $old_post;
}
