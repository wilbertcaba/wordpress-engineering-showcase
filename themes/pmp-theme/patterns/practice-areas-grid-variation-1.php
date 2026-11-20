<?php
/**
 * Title: Practice Areas Grid (Variation 1)
 * Slug: pmp-theme/practice-areas-grid-variation-1
 * Categories: layout
 * Keywords: practice areas, grid
 *
 * @package PMP
 */

?>

<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|64"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"center"}} -->
<div class="wp-block-group"><!-- wp:heading {"textAlign":"center","style":{"elements":{"link":{"color":{"text":"var:preset|color|primary"}}}},"textColor":"primary","fontSize":"xx-large"} -->
<h2 class="wp-block-heading has-text-align-center has-primary-color has-text-color has-link-color has-xx-large-font-size"><?php esc_html_e( 'Areas of expertise include:' ); ?></h2>
<!-- /wp:heading -->

<!-- wp:pmp/content-display {"variationName":"grid"} -->
<!-- wp:query {"query":{"postType":"pmp_practice_area","perPage":"8","inherit":false,"sticky":"","parents":[]},"namespace":"pmp/content-card-variation","showPostAuthor":false,"showPostDate":false,"showReadingTime":false,"showTaxonomy":false} -->
<div class="wp-block-query">
<!-- wp:post-template {"layout":{"type":"grid","columns":3,"columnCount":4}} -->
<!-- wp:pmp/content-card-template -->
<!-- wp:post-featured-image {"sizeSlug":"medium"} /-->

<!-- wp:post-title {"isLink":true} /-->

<!-- wp:post-excerpt {"moreText":"Read more"} /-->
<!-- /wp:pmp/content-card-template -->
<!-- /wp:post-template -->
</div>
<!-- /wp:query -->
<!-- /wp:pmp/content-display -->
</div>
<!-- /wp:group -->
