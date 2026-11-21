<?php
/** Focused showcase bootstrap; original block renderers are retained in includes/blocks. */
define( 'PMP_THEME_PATH', get_template_directory() . '/' );
add_action( 'after_setup_theme', static function () {
    add_theme_support( 'post-thumbnails' );
    add_theme_support( 'title-tag' );
    add_theme_support( 'editor-styles' );
    add_editor_style( 'dist/css/frontend.css' );
} );
add_action( 'init', static function () {
    register_block_pattern_category( 'layout', [ 'label' => 'Layout' ] );
    foreach ( glob( __DIR__ . '/dist/blocks/*/block.json' ) as $file ) {
        $folder = dirname( $file );
        $options = [];
        if ( file_exists( "$folder/markup.php" ) ) {
            $options['render_callback'] = static function ( $attributes, $content, $block ) use ( $folder ) {
                $context = $block->context;
                ob_start();
                include "$folder/markup.php";
                return ob_get_clean();
            };
        }
        register_block_type( $folder, $options );
    }
} );
function pmp_showcase_script( $name ) {
    $path = __DIR__ . "/dist/js/$name.asset.php";
    if ( ! file_exists( $path ) ) { return; }
    $asset = require $path;
    wp_enqueue_script( "pmp-$name", get_template_directory_uri() . "/dist/js/$name.js", $asset['dependencies'], $asset['version'], true );
}
add_action( 'wp_enqueue_scripts', static function () {
    wp_enqueue_style( 'pmp-showcase', get_template_directory_uri() . '/dist/css/frontend.css', [], '1.0.0' );
} );
add_action( 'enqueue_block_editor_assets', static function () {
    pmp_showcase_script( 'editor' );
    wp_enqueue_style( 'pmp-editor-overrides', get_template_directory_uri() . '/dist/css/editor.css', [], '1.0.0' );
} );
// Server-side context counterpart of the editor extension.
add_filter( 'block_type_metadata', static function ( $metadata ) {
    if ( 'core/query' === $metadata['name'] ) {
        foreach ( ['variationName', 'showMore'] as $name ) {
            $metadata['providesContext'][$name] = $name;
            $metadata['attributes'][$name] = [ 'type' => 'variationName' === $name ? 'string' : 'boolean' ];
        }
    }
    return $metadata;
} );
$meta_hooks = __DIR__ . '/includes/blocks/post-meta/hooks.php';
if ( file_exists( $meta_hooks ) ) { require_once $meta_hooks; }
require_once __DIR__ . '/includes/query-render.php';

// Focused Table of Contents module; no private application autoloader required.
require_once __DIR__ . '/includes/classes/Module.php';
require_once __DIR__ . '/includes/classes/Block/TocBlock.php';
(new \PMP\Theme\Block\TocBlock())->register();
require_once __DIR__ . '/includes/toc-settings.php';

require_once __DIR__ . '/includes/breadcrumb-helpers.php';
require_once __DIR__ . '/includes/classes/Block/BreadcrumbsBlock.php';
require_once __DIR__ . '/includes/classes/Integration/SeoBreadcrumbs.php';
foreach ( [new \PMP\Theme\Block\BreadcrumbsBlock(), new \PMP\Theme\Integration\SeoBreadcrumbs()] as $module ) {
    if ( $module->can_register() ) { $module->register(); }
}
add_action( 'wp_enqueue_scripts', static function () {
    if ( \PMP\Plugin\Breadcrumbs\Resolver::is_enabled() ) { pmp_showcase_script( 'breadcrumbs' ); }
} );
