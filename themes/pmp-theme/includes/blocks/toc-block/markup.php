<?php
/**
 * Table of Contents block markup
 *
 * @package PMP
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 * @var array    $context    Block context.
 */

use PMP\Theme\Block\TocBlock;

$toc_post = get_post( $block->context['postId'] ?? get_the_ID() );

if ( ! $toc_post instanceof WP_Post ) {
	return;
}

$toc_levels = TocBlock::included_levels( $attributes );

if ( empty( $toc_levels ) ) {
	return;
}

// Walk every heading so dedupe suffixes match the heading id filter, then keep the enabled levels.
$toc_used     = TocBlock::reserved_ids();
$toc_headings = TocBlock::collect_headings( parse_blocks( $toc_post->post_content ), $toc_used );
$toc_headings = array_values(
	array_filter(
		$toc_headings,
		static function ( $heading ) use ( $toc_levels ) {
			return in_array( $heading['level'], $toc_levels, true );
		}
	)
);

/**
 * Filters the headings the table of contents lists, after the level filter.
 *
 * @param array    $toc_headings Headings with `text`, `level` and `anchor`.
 * @param \WP_Post $toc_post     The post being outlined.
 */
$toc_headings = (array) apply_filters( 'pmp_theme_toc_headings', $toc_headings, $toc_post );

if ( empty( $toc_headings ) ) {
	return;
}

$toc_placement  = TocBlock::placement( $attributes['placement'] ?? 'always' );
$toc_is_desktop = 'mobile' !== $toc_placement;
$toc_scroll_spy = $toc_is_desktop && ! empty( $attributes['scrollSpy'] );
$toc_sticky     = $toc_is_desktop && ! empty( $attributes['stickyDesktop'] );
$toc_show_title = ! empty( $attributes['showTitle'] );
$toc_collapsible = ! empty( $attributes['collapsible'] ) && ! $toc_sticky;
$toc_title      = (string) ( $attributes['title'] ?? '' );
$toc_title_text = trim( wp_strip_all_tags( $toc_title ) );
$toc_title_tag  = TocBlock::title_tag( $attributes['headingTag'] ?? 'h2' );
$toc_nav_label  = '' !== $toc_title_text ? $toc_title_text : __( 'Table of Contents', 'pmp-theme' );

$toc_classes = [ 'toc-block', 'toc-block--' . $toc_placement ];

if ( $toc_sticky ) {
	$toc_classes[] = 'toc-block--sticky';
}

if ( $toc_scroll_spy ) {
	$toc_classes[] = 'toc-block--scrollspy';
}

$toc_wrapper = [
	'class'          => implode( ' ', $toc_classes ),
	'style'          => TocBlock::custom_properties( $attributes ),
	'data-placement' => $toc_placement,
	'data-scrollspy' => $toc_scroll_spy ? 'true' : 'false',
];

// A user-set anchor (Advanced > HTML anchor) wins over the default instance id.
if ( empty( $attributes['anchor'] ) ) {
	$toc_wrapper['id'] = $toc_is_desktop ? 'table-of-contents' : 'table-of-contents-mobile';
}

$toc_wrapper_attributes = get_block_wrapper_attributes( array_filter( $toc_wrapper, 'strlen' ) );
?>
<div <?php echo $toc_wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>>
	<?php if ( $toc_collapsible ) : ?>
		<details class="toc-block__details">
			<summary class="toc-block__title toc-block__summary"><?php echo wp_kses_post( '' !== $toc_title_text ? $toc_title : __( 'Table of Contents', 'pmp-theme' ) ); ?></summary>
			<nav class="toc-block__nav" aria-label="<?php echo esc_attr( $toc_nav_label ); ?>">
				<?php echo TocBlock::render_list( $toc_headings ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in render_list(). ?>
			</nav>
		</details>
	<?php else : ?>
		<?php if ( $toc_show_title && '' !== $toc_title_text ) : ?>
			<<?php echo esc_attr( $toc_title_tag ); ?> class="toc-block__title"><?php echo wp_kses_post( $toc_title ); ?></<?php echo esc_attr( $toc_title_tag ); ?>>
		<?php endif; ?>
		<nav class="toc-block__nav" aria-label="<?php echo esc_attr( $toc_nav_label ); ?>">
			<?php echo TocBlock::render_list( $toc_headings ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in render_list(). ?>
		</nav>
	<?php endif; ?>
</div>
<?php
TocBlock::print_scroll_offset_style( $attributes['scrollOffset'] ?? '' );
