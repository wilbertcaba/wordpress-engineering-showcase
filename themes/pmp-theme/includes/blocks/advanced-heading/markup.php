<?php
/**
 * Advanced Heading block markup
 *
 * @package PMP
 *
 * @var array    $attributes         Block attributes.
 * @var string   $content           Block content.
 * @var WP_Block $block             Block instance.
 * @var array    $context           Block context.
 */

// Debug: Let's see what we're getting
error_log( 'Advanced Heading Attributes: ' . print_r( $attributes, true ) );

// Get dynamic content if enabled
$heading_content = $attributes['headingTitle'];

// Skip rendering if the heading content is a placeholder
if ( strpos( $heading_content, 'Field Name:' ) === 0 ) {
	$heading_content = '';
}

if ( ! empty( $attributes['isDynamic'] ) ) {
	switch ( $attributes['dynamicSource'] ) {
		case 'current-post':
			switch ( $attributes['sourceField'] ) {
				case 'title':
					$heading_content = get_the_title();
					break;
				case 'excerpt':
					$heading_content = get_the_excerpt();
					break;
			}
			break;

		case 'custom-field':
			if ( ! empty( $attributes['customField'] ) ) {
				// First try ACF function if available
				if ( function_exists( 'get_field' ) ) {
					$field_value = get_field( $attributes['customField'] );
				} else {
					// Fallback to standard meta
					$field_value = get_post_meta( get_the_ID(), $attributes['customField'], true );
				}

				if ( $field_value ) {
					if ( is_array( $field_value ) || is_object( $field_value ) ) {
						// Handle arrays/objects by converting to string
						$heading_content = is_array( $field_value ) ? implode( ', ', $field_value ) : '';
					} else {
						$heading_content = $field_value;
					}
				} else {
					// No field value found, don't display anything
					$heading_content = '';
				}
			}
			break;

		case 'custom-input':
			$heading_content = $attributes['customInput'];
			break;

		case 'custom-meta':
			if ( ! empty( $attributes['customMetaKey'] ) ) {
				// First try to get post meta
				$meta_value = get_post_meta( get_the_ID(), $attributes['customMetaKey'], true );
				if ( $meta_value ) {
					$heading_content = $meta_value;
				} else {
					// Check if it's a taxonomy
					$taxonomies = get_object_taxonomies( get_post_type() );

					if ( in_array( $attributes['customMetaKey'], $taxonomies, true ) ) {
						$terms = get_the_terms( get_the_ID(), $attributes['customMetaKey'] );

						if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
							// Get all term names
							$term_names = array_map(
								function ( $term ) {
									return $term->name;
								},
								$terms
							);

							// Join them with commas
							$heading_content = implode( ', ', $term_names );
						} else {
							// No terms found, don't display anything
							$heading_content = '';
						}
					} else {
						// Not a taxonomy or meta field, don't display anything
						$heading_content = '';
					}
				}
			}
			break;
	}
}

// Final check - if still no content, don't render anything
if ( empty( $heading_content ) ) {
	return;
}

// Set wrapper classes
$wrapper_classes = array( 'pmp-advanced-heading' );

// Add alignment class if set
if ( isset( $attributes['headingAlign'] ) ) {
	$wrapper_classes[] = 'has-text-align-' . $attributes['headingAlign'];
}
$wrapper_attributes = get_block_wrapper_attributes( array( 'class' => implode( ' ', $wrapper_classes ) ) );
?>

<?php
	$link_open  = '';
	$link_close = '';

if ( ! empty( $attributes['linkToPost'] ) ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$link_open  = '<a href="' . esc_url( get_permalink() ) . '" class="pmp-advanced-heading-link">';
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$link_close = '</a>';
}
?>
<?php echo $link_open; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( $heading_content ) : ?>
		<<?php echo esc_attr( $attributes['headingTag'] ?? 'h2' ); ?> class="heading-text">
			<?php echo wp_kses_post( $heading_content ); ?>
		</<?php echo esc_attr( $attributes['headingTag'] ?? 'h2' ); ?>>
	<?php endif; ?>

	<?php if ( isset( $attributes['seperatorStyle'] ) && 'none' !== $attributes['seperatorStyle'] ) : ?>
		<div class="separator-wrap">
			<div class="separator separator-<?php echo esc_attr( $attributes['seperatorStyle'] ); ?>"></div>
		</div>
	<?php endif; ?>
</div>
<?php echo $link_close; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
