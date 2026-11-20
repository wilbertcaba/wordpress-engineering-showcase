<?php
/**
 * Block: Content Display
 * Variation: Grid
 *
 * @package PMP
 *
 * @var array    $attributes         Block attributes.
 * @var string   $content            Block content.
 * @var WP_Block $block              Block instance.
 * @var array    $context            Block context.
 */

$align_class_name   = empty( $attributes['textAlign'] ) ? '' : "has-text-align-{$attributes['textAlign']}";
$wrapper_attributes = [ 'class' => $align_class_name ];
?>

<div <?php echo get_block_wrapper_attributes( $wrapper_attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
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
</div>
