# Verification record

Current shared WordPress runtime: **7.0.9**. Earlier sections retain their original verification versions; see the upgrade and Breadcrumbs record below.

Verified locally on November 20, 2026 with WordPress 6.8.3, Local's PHP 8.2.29 binary, the wp-env PHP/SQLite runtime, Node 24.20.0, npm 11.19.0, and Playwright Chromium.

| Check | Result |
| --- | --- |
| Baseline export from the tagged Git commit | Passed; independent npm installation and asset build |
| Extended theme build | Passed with pinned dependencies |
| JavaScript lint | Passed: ESLint recommended rules and React Hooks checks |
| PHP syntax | Passed for extracted code, bootstrap, seed and integration scripts |
| Recursive block filtering | Three unit tests passed |
| WordPress integration | Passed in both isolated states |
| Fixture setup repeated | Eight practice areas remained in each site; no duplicates |
| Frontend/editor browser suite | Four tests passed together |
| Keyboard navigation and unique per-post images | Passed in both views |
| Dynamic secondary-title editor previews | Eight distinct per-post previews confirmed |
| Screenshots | Desktop 1440px and mobile 390px; no horizontal overflow |
| Local package linker | Both state mappings accepted; collision preflight preserved existing packages without partial linking |
| Source provenance | SHA-256 checks passed for 40 retained source files |
| Credential-pattern review | No matches for private keys, GitHub tokens, AWS access IDs, live Stripe keys or credential-bearing HTTP URLs in the curated files/history |
| Original private checkouts | Git status remained clean |

The integration checks cover expected metadata registration, authenticated saves, sanitization, anonymous write rejection, valid image rendering, image removal, deleted attachments and attachment-ID normalization. Browser checks cover detail-page navigation, media selection/replacement/removal, saves/reloads, image visibility changes, editor block validity, and absence of JavaScript page errors in the smoke flow.

## Runtime limits

Docker is not installed on the verification machine. Docker configurations and commands are supplied, but a Docker/MariaDB execution has not been validated. The Local application was not used to provision two additional sites; the Local linking/activation workflow is documented and its linker was exercised against isolated WordPress roots. The functional checks used Local's PHP binary through wp-env's PHP/SQLite runtime. Those results are not presented as Docker or Local-application verification.

## Tooling notes

The build retains 10up Toolkit 5.2.3. Webpack/Terser are pinned for compatibility, and the after-state dependency overrides patch isomorphic-git, Lodash, PostCSS, Sharp and serialize-javascript. The original JSDoc/formatter lint plugins fail on the current dependency/runtime combination, so the after-state lint command explicitly uses ESLint recommended and React Hooks checks. It does not claim to run the entire historical 10up lint configuration or PHP coding-standard checks.

At verification time npm reported seven moderate advisories in the root tooling and seventeen advisories (ten low, five moderate, two high) in the after theme's dependency tree. The remaining high findings concern the legacy webpack development-server chain; the verified demo uses wp-env to serve WordPress and does not launch that server. The historical before snapshot retains its original tooling versions and corresponding advisories. A full build-stack migration is outside this extraction.

Webpack also reports the existing editor-bundle size recommendation and a deprecated PostCSS plugin API. These do not prevent the verified build. Install dependencies/build tools only for local demonstration; they are not a deployment workflow.

## Publication

The Git history is newly created and contains only the curated extraction, fixtures, documentation and showcase tooling. No production deployments, uploads, database exports, credentials or original Git history are included.

Publication and license review remains required by the agreed plan; see NOTICE.md. No public push is part of the local verification record. The final local tag `practice-areas-grid-after` identifies the verified demo, while `practice-areas-grid-extracted` identifies the original feature extraction before showcase corrections.

## Logo Slider addition — November 20, 2026

The after-only Logo Slider was extracted with its label block and pinned Splide dependencies. Verification used the same WordPress 6.8.3 / PHP 8.2.29 / SQLite environment as the Grid demo.

- Eight browser tests passed together: the four existing Grid tests and four Logo Slider tests.
- Logo Slider checks confirmed both sizing modes, distinct image proportions, an optional label, motion-preference changes, hover/focus pausing, keyboard links, static rendering without JavaScript, absence from the before site, valid editor blocks, and settings persistence after saving/reloading.
- WordPress integration checks passed for both environments, including slider registration, one demo page, six fixtures, twelve original slides across two instances, alternative text, image links, and server-side numeric bounds.
- The feature-only seed command was run twice. The Grid page-content hash and home-page setting matched before and after; no duplicate logo pages or attachments were created.
- The feature build, JavaScript lint, PHP syntax checks, three existing unit tests, and hashes for 52 extracted source files passed.
- Desktop and mobile screenshots were inspected. The after navigation now links to both feature demos, and Grid screenshots were refreshed to reflect that navigation.

A browser test exposed a WordPress responsive-image compatibility issue: an image switched from lazy to eager loading could retain `sizes="auto"`, producing 3000px size containment. The extracted initializer removes that keyword before decoding automatic-width images. This adaptation and the per-block script entry point are recorded in the provenance manifest and feature README. The private theme source and existing comparison tags were not changed.

Docker execution and Local-app provisioning remain outside the verified runtime coverage recorded above.

## Video Modal addition — November 20, 2026

The after-only Video Modal was extracted with its editor controls, dynamic renderer, native dialog behavior, and provider handling. The demo uses an original bundled four-second silent WebM clip and PNG icon, with no external media dependency.

- All thirteen browser tests passed together: four Grid, four Logo Slider, and five Video Modal tests.
- Video Modal checks exercised actual local playback, lazy media loading, independent instances, desktop/mobile bounds, keyboard focus and Escape, backdrop/close-button dismissal, playback-end dismissal, native media cleanup, prior overflow restoration, and editor settings saved/reloaded without invalid blocks.
- Controlled YouTube/Vimeo iframe responses verified origin/source validation, provider subscriptions, and dismissal/cleanup. Live third-party playback was not verified.
- WordPress integration checks passed in both states, including after-only registration, one owned page, two attachments, both trigger styles, escaped titles, absent initial player markup, and block script registration.
- The feature-only seed ran twice. Grid and Logo Slider page-content hashes and the home-page setting matched before and after; fixture counts remained stable.
- The build, JavaScript lint, PHP syntax checks, eight unit tests, and hashes for sixty extracted source files passed. Existing webpack size recommendations remain as recorded above.
- Desktop/mobile dialog screenshots were inspected; existing after screenshots were refreshed for the new navigation link.

Showcase adaptations include URL validation, Vimeo privacy-hash preservation and its current `ended` subscription, explicit native-video pause/unload, and restoration of the previous body overflow style. These are recorded in provenance separately from the original implementation. Private source checkouts and comparison tags were left unchanged. Docker execution and Local-app provisioning remain unverified as described above.

## Table of Contents addition — November 20, 2026

The Table of Contents is presented as a new in-house feature, with one document covering dbeqiri1396’s initial block/early enhancer and Wilbert Caba’s later rework and extensions. The current after-only demo includes a long block-content guide and a classic-HTML guide; no historical TOC implementation was added to the before environment.

- All seventeen browser tests passed together, including four TOC tests and the thirteen existing feature tests.
- TOC checks covered matching server links/IDs, repeated and accented headings, explicit anchors, scroll highlighting, sticky and nested-sticky behavior, desktop/mobile placement at 782/781px, keyboard expansion, classic links without JavaScript, editor save/reload, and administrator application/clearing of shared styles.
- WordPress checks passed in both states. TOC assertions cover owned page counts, classic discovery, list nesting, title exclusion, output escaping, CSS-value validation, shared-default inheritance and explicit zero, denied anonymous/editor writes, administrator REST saves, and automatic insertion for both block and classic content.
- The isolated TOC seed ran repeatedly without changing other owned feature records, home-page settings, the auto-insert option, or shared styles. It keeps one page per owned guide key.
- The theme build, JavaScript lint, PHP syntax checks, twelve unit tests, and hashes for seventy-five extracted source files passed. Existing build/tooling limitations above still apply.
- Desktop and mobile screenshots were visually inspected. Existing feature screenshots were refreshed for the new navigation link.

Testing exposed duplicate automatic heading IDs on the pinned WordPress 6.8 editor when repeated headings mounted together. A showcase-only batched anchor generator replaces that eager core behavior and has a dedicated regression test. The showcase also rejects CSS declaration delimiters in color values and supplies the missing desktop media-query token. These adaptations, the focused settings extraction, and authorship are documented in provenance and the feature guide.

The private theme checkout and existing comparison tags were left unchanged. Docker execution and Local-app provisioning remain outside verified coverage. These results describe the local PHP/SQLite runtime.

### Hierarchical numbering follow-up

The Numbered style now uses hierarchical counters (`1`, `1.1`, `1.1.1`, `2`, `2.1`) instead of restarting nested entries at a bare `1`. The shared style applies to the editor and frontend. The build, provenance checks, and responsive TOC browser check passed; desktop/mobile screenshots were refreshed and inspected, and a separate editor preview was visually checked without saving content.


## Shared WordPress upgrade and Breadcrumbs — November 20, 2026

Both environments were upgraded from WordPress 6.8.3 to **7.0.9** before Breadcrumbs was extracted. PHP 8.2.29, SQLite, Node 24.20.0 and the historical before theme/plugin source were retained. SQLite online backups were saved in ignored `.showcase/backups/pre-wordpress-7.0.9/` before the upgrade.

- Both installed WordPress versions were confirmed as 7.0.9, and database upgrades completed. Main-checkout wp-env configuration pins that same release for future installs.
- SHA-256 checks of the before theme/plugin source remained unchanged. Before showcase-owned page, practice-area and attachment IDs, titles, content and parent values matched the pre-upgrade database backup after final verification.
- Before adding Breadcrumbs, both environments passed integration checks and all seventeen existing browser tests, including the historical Grid editor/frontend.
- After extraction, all **twenty-one browser tests** passed together. Four Breadcrumbs tests cover desktop/mobile trails, local links, configured practice-area parents, keyboard disclosure/dismissal, front-page suppression, anonymous settings-write rejection, settings persistence, enable/disable behavior, and saved/reloaded core block controls.
- Final WordPress integration checks passed in both states, including version checks, core-block availability, after-only PMP integration, fixture counts, resolver/rendered-link agreement, core visibility controls, unpublished ancestors, no empty disabled band, settings sanitization, and shortcode stripping without execution.
- Yoast and SmartCrawl adapters passed checks against representative provider arrays. No SEO plugin was installed; live provider/schema output, translation, Shadow Terms and topic-hub integrations were not validated.
- Feature-only seeding ran twice without changing other feature records or home-page settings. It creates four owned pages and intentionally restores the documented breadcrumb demo settings.
- The build, JavaScript lint, PHP syntax checks, twelve unit tests, and hashes for **eighty-five** extracted source files passed. Desktop/mobile Breadcrumbs screenshots were inspected; existing screenshots were refreshed for the navigation and breadcrumb band.

A Logo Slider integration assertion was corrected to honor an omitted default-false attribute after editor serialization. The TOC browser check now places a heading above its reading line before asserting the active section, avoiding an assumption about the initial page height once the breadcrumb band is present. Neither required changing the historical before implementation.

Source adaptations are recorded in provenance: focused bootstrap and helper extraction, guarding the optional Practice Area Types class, a dedicated frontend entry, the button reset utility, checkbox-label association, and known-scalar settings sanitization. Private theme/plugin checkouts and historical comparison tags were unchanged. The pre-existing local TOC guide edit was preserved.

The verified runtime is PHP/SQLite. Docker execution and Local-app provisioning remain unverified; their configuration/instructions have been updated to the same WordPress release. The existing build warnings and tooling limits documented above remain.
