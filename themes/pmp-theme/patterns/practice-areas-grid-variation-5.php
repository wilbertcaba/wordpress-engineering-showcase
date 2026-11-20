<?php
/**
 * Title: Practice Areas Grid (Variation 5)
 * Slug: pmp-theme/practice-areas-grid-variation-5
 * Categories: layout
 * Keywords: practice areas, grid
 *
 * @package PMP
 */

?>

<!-- wp:group {"metadata":{"name":"Practice Areas"},"align":"full","className":"practice-areas-grid-variation-5","style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|88","left":"var:preset|spacing|32","right":"var:preset|spacing|32"},"margin":{"top":"0","bottom":"0"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull practice-areas-grid-variation-5" style="margin-top:0;margin-bottom:0;padding-top:0;padding-right:var(--wp--preset--spacing--32);padding-bottom:var(--wp--preset--spacing--88);padding-left:var(--wp--preset--spacing--32)"><!-- wp:group {"metadata":{"name":"Hero"},"align":"full","className":"hero","backgroundColor":"tertiary","layout":{"type":"constrained","justifyContent":"center"}} -->
<div class="wp-block-group alignfull hero has-tertiary-background-color has-background"><!-- wp:columns -->
<div class="wp-block-columns"><!-- wp:column {"width":"50%"} -->
<div class="wp-block-column" style="flex-basis:50%"><!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group"><!-- wp:heading {"textAlign":"left","style":{"elements":{"link":{"color":{"text":"var:preset|color|primary"}}}},"textColor":"primary"} -->
<h2 class="wp-block-heading has-text-align-left has-primary-color has-text-color has-link-color">Our Expertise</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"fontSize":"medium"} -->
<p class="has-medium-font-size">Our <strong>City Name Legal Consultants</strong> provide personalized guidance across a range of practice areas to meet your needs.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column -->

<!-- wp:column {"verticalAlignment":"bottom"} -->
<div class="wp-block-column is-vertically-aligned-bottom"><!-- wp:buttons {"layout":{"type":"flex","justifyContent":"right"}} -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">View All Practice areas</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->

<!-- wp:group {"metadata":{"name":"Grid"},"style":{"spacing":{"margin":{"top":"-62px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group" style="margin-top:-62px"><!-- wp:pmp/content-display {"variationName":"grid"} -->
<!-- wp:query {"queryId":34,"query":{"postType":"pmp_practice_area","inherit":false,"sticky":"","parents":[],"format":[],"orderBy":"date","offset":0,"perPage":10},"namespace":"pmp/content-card-variation","layout":{"type":"default"},"variationName":"cover","showPostTitle":false,"useSecondaryTitle":true,"showFeaturedImage":false,"showPostExcerpt":false,"showPostAuthor":false,"showPostDate":false,"showReadingTime":false,"showTaxonomy":false,"showMore":false,"showCardImage":true} -->
<div class="wp-block-query"><!-- wp:post-template {"className":"col sm:col-2 md:col-3 lg:col-4","layout":{"type":"grid","columns":3,"columnCount":4,"minimumColumnWidth":null}} -->
<!-- wp:pmp/content-card-template {"className":"practice-area-card"} -->
<!-- wp:pmp/post-meta {"metaKey":"card_image","isImage":true} /-->

<!-- wp:pmp/advanced-heading {"headingTitle":"Field Name: title_secondary","headingTag":"h3","isDynamic":true,"dynamicSource":"custom-field","customField":"title_secondary","style":{"elements":{"link":{"color":{"text":"var:preset|color|white"}}}},"textColor":"white"} -->
<div class="wp-block-pmp-advanced-heading has-white-color has-text-color has-link-color"><h3 class="pmp-heading-title">Field Name: title_secondary</h3></div>
<!-- /wp:pmp/advanced-heading -->

<!-- wp:post-terms {"term":"category"} /-->
<!-- /wp:pmp/content-card-template -->
<!-- /wp:post-template --></div>
<!-- /wp:query -->
<!-- /wp:pmp/content-display --></div>
<!-- /wp:group --></div>
<!-- /wp:group -->
