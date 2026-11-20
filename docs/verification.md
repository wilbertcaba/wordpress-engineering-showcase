# Verification record

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
