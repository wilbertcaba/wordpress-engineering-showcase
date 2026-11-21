<?php
/** Seed only the fictional Table of Contents guides. */
namespace PMP\Showcase\Toc;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit; }
if ( ! \WP_Block_Type_Registry::get_instance()->is_registered( 'pmp/toc-block' ) ) { \WP_CLI::error( 'Build and activate the after theme first.' ); }
function block( $name, $attrs = [], $html = '', $children = [] ) {
    return serialize_block( [ 'blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => $children, 'innerHTML' => $html, 'innerContent' => [ $html ] ] );
}
function toc( $attrs ) { return block( 'pmp/toc-block', $attrs ); }
function page( $slug, $title, $content ) {
    $key = 'toc-' . $slug;
    $ids = get_posts( [ 'post_type' => 'page', 'post_status' => 'any', 'meta_key' => '_showcase_key', 'meta_value' => $key, 'fields' => 'ids', 'numberposts' => 2 ] );
    if ( count( $ids ) > 1 ) { \WP_CLI::error( 'Duplicate showcase key: ' . $key ); }
    $id = $ids[0] ?? 0;
    $collision = get_page_by_path( $slug );
    if ( $collision && (int) $collision->ID !== (int) $id ) { \WP_CLI::error( 'Demo URL already belongs to another page: ' . $slug ); }
    $result = wp_insert_post( [ 'ID' => $id, 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $content, 'meta_input' => [ '_showcase_key' => $key ] ], true );
    if ( is_wp_error( $result ) ) { \WP_CLI::error( $result->get_error_message() ); }
}
$base = [ 'includeH3' => true, 'includeH4' => true, 'className' => 'is-style-numbered' ];
$intro = block( 'core/paragraph', [], '<p>A fictional reading guide demonstrating server-rendered anchor links, nested headings, desktop highlighting, and a collapsible mobile table of contents. <a href="/table-of-contents-classic/">Try the classic-content example</a>.</p>' );
$article = toc( $base + [ 'placement' => 'mobile', 'collapsible' => true ] );
$sections = [ [2,'Plan a useful guide'],[3,'Understand the audience'],[4,'Choose a clear structure'],[2,'Questions &amp; answers'],[3,'Repeated heading'],[3,'Repeated heading'],[2,'Café resources'],[2,'Review checklist'] ];
foreach ( $sections as $index => [ $level, $text ] ) {
    $attrs = [ 'level' => $level ];
    $id = '';
    if ( 3 === $index ) { $attrs['anchor'] = 'questions'; $id = ' id="questions"'; }
    $article .= block( 'core/heading', $attrs, "<h$level class=\"wp-block-heading\"$id>$text</h$level>" );
    for ( $j = 0; $j < 3; $j++ ) {
        $article .= block( 'core/paragraph', [], '<p>A useful guide gives readers a clear route through the subject. This fictional text creates enough reading space to inspect the current-section highlight, follow a heading link, and compare the desktop sidebar with the mobile outline. Editors can change the headings without maintaining a separate navigation list.</p>' );
    }
}
$sidebar = toc( $base + [ 'placement' => 'desktop', 'stickyDesktop' => true, 'stickyTop' => '24px' ] );
// Custom HTML owns only the demo layout wrapper; the TOCs and article remain real editable blocks.
$layout = block( 'core/html', [], '<div class="showcase-toc-layout">' ) . $sidebar . block( 'core/html', [], '<div class="showcase-toc-article">' ) . $article . block( 'core/html', [], '</div></div>' );
page( 'table-of-contents', 'Table of Contents', $intro . $layout );
$classic = '<p>This fictional article is stored as classic HTML. Its heading IDs and outline are generated at render time. <a href="/table-of-contents/">Return to the block-content example</a>.</p><h2>Classic introduction</h2><p>Existing articles can gain navigation without being converted to heading blocks.</p><h3>Legacy detail</h3><p>Nested headings remain part of the outline.</p><h2 id="saved-classic-anchor">Preserved anchor</h2><p>Existing manual IDs remain intact.</p><h2>Classic introduction</h2><p>Repeated titles receive deterministic suffixes.</p>';
// Explicit block plus raw HTML demonstrates classic-heading collection without changing the site-wide auto-insert option.
page( 'table-of-contents-classic', 'Table of Contents — Classic Content', toc( array_merge( $base, [ 'className' => 'is-style-rail' ] ) ) . $classic );
\WP_CLI::success( 'Seeded two TOC guides. Other feature records, shared styles and home-page settings were preserved.' );
