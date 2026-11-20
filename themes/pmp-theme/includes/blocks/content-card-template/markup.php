<?php
/**
 * Example block markup
 *
 * @package PMP
 *
 * @var array    $attributes         Block attributes.
 * @var string   $content            Block content.
 * @var WP_Block $block              Block instance.
 * @var array    $context            Block context.
 */

if ( 'pmp_lawyer' === $context['postType'] ) {
	$variation_class_name = 'variation-lawyer';
} elseif ( 'pmp_case_result' === $context['postType'] ) {
	$variation_class_name = 'variation-case-result';
} else {
	$variation_class_name = ! empty( $context['variationName'] ) ? "variation-{$context['variationName']}" : '';
}

// This is to ensure all search results use the default card style for consistency
if ( is_search() ) {
	$variation_class_name = 'variation-search';
}

$is_content_variation = false;

// Check if Core details is a Content Display block variation
if ( isset( $block->parsed_block['innerBlocks'] ) && isset( $block->parsed_block['innerBlocks'][0] ) ) { // Check if innerblocks is available
	$first_block       = $block->parsed_block['innerBlocks'][0];
	$first_block_attrs = $first_block['attrs'];
	if ( 'core/details' === $first_block['blockName'] && isset( $first_block_attrs['className'] ) && str_contains( $first_block_attrs['className'], 'content-display-accordion-item' ) ) {
		$is_content_variation = true;
	}
}

// Check the current post type and do not display link if matches the disallowed post types.
$disallowed_post_types_link = [
	'pmp_lawyer'      => true,
	'pmp_case_result' => true,
	'pmp_testimonial' => true,
];
if ( isset( $disallowed_post_types_link[ $context['postType'] ] ) ) {
	$is_content_variation = true;
}

$wrapper_attributes = get_block_wrapper_attributes( [ 'class' => $variation_class_name ] );
$card_link          = get_the_permalink( $context['postId'] );
$card_title         = get_the_title( $context['postId'] );

?>

<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
		/*
		* the content is the html generated from innerBlocks
		* it is being created from the save method in JS or the render_callback
		* in php and is sanitized.
		*
		* Re sanitizing it through `wp_kses_post` causes
		* embed blocks to break and other core filters don't apply.
		* therefore no additional sanitization is done and it is being output as is
		*/
		echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>

	<?php if ( ! $is_content_variation ) : ?>
		<a href="<?php echo esc_url( $card_link ); ?>" class="wp-block-pmp-content-card-template__link">
			<span class="visually-hidden">
				<?php
				/* translators: %s: Card title */
				echo esc_html( sprintf( __( 'Go to %s', 'pmp-theme' ), $card_title ) );
				?>
			</span>
		</a>
	<?php endif; ?>
</div>
