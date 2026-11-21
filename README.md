# WordPress Engineering Showcase

This repository showcases my WordPress development work, including extensions to theme and plugin features originally developed by 10up, as well as new features I built to meet business needs and goals. Each feature has dedicated documentation explaining its purpose, implementation, and engineering decisions. Before/after examples are included where relevant.

This repository includes only the theme and plugin code needed for the demos, with credit to the original authors. You don’t need access to the private repositories to run it. This is a wp-content repository, not a WordPress core installation.

## Features

| Feature | Type | Demo availability | Documentation |
| --- | --- | --- | --- |
| Practice Areas Grid — Variation 5 | Extension | Before and after | [Feature README](docs/practice-areas-grid-variation-5/README.md) |
| Logo Slider | New feature | After only | [Feature README](docs/logo-slider/README.md) |
| Video Modal | New feature | After only | [Feature README](docs/video-modal/README.md) |
| Table of Contents | New feature | After only | [Feature README](docs/table-of-contents/README.md) |
| Breadcrumbs | Extension of WordPress core | PMP integration in after only | [Feature README](docs/breadcrumbs/README.md) |

Extensions may include a comparison with their original behavior. New features are available in the after environment only. Each feature’s documentation explains what is available and how to review it.

## Running the demos

The **before** environment contains the historical code used for comparisons, loaded from `.showcase/before/`. The **after** environment contains the current showcase implementation, loaded from the main project’s `themes/` and `mu-plugins/` folders. New features added to the showcase will run in the after environment without requiring a matching before example.

### Choose a runtime

You can run the demos using Docker or PHP installed on your computer. The `SHOWCASE_RUNTIME` environment variable selects which option to use. If you leave it unset, the scripts use Docker.

Run `npm run demo:start` for Docker, or `SHOWCASE_RUNTIME=php npm run demo:start` for PHP/SQLite.

Choose Docker or PHP and keep using that option for all demo commands. For PHP, put `SHOWCASE_RUNTIME=php` before each command—the terminal won’t remember your choice between commands.

Both environments use WordPress 7.0.9. Both runtime options use Node 24.20.0 and npm 11. If you choose:

- A) **Docker:** Docker Desktop must be installed and running. WordPress and PHP run inside containers.
- B) **PHP/SQLite:** Install PHP if it is not already available, and ensure PHP and WP-CLI are on your PATH. PHP 8.2 matches the demo configuration. Docker and the Local app are not required.

### First-time setup

Run these commands from the project folder. Choose one runtime:

**Docker (default)**

```sh
npm ci
npm run demo:setup
```

**PHP/SQLite**

```sh
npm ci
SHOWCASE_RUNTIME=php npm run demo:setup
```

`demo:setup` installs the theme dependencies, builds both versions, starts both WordPress sites, and seeds the fictional content. Running it again restores the seeded demo records and home page, overwriting edits to those records. Use `demo:start` for everyday use instead.

Open [before](http://localhost:8888) and [after](http://localhost:8890). The Grid is the home page; [Logo Slider](http://localhost:8890/logo-slider/), [Video Modal](http://localhost:8890/video-modal/), and [Table of Contents](http://localhost:8890/table-of-contents/) are available in the after environment only. The [Breadcrumbs guide](docs/breadcrumbs/README.md) adds a nested-page and practice-area trail example. Local-only wp-env login: `admin` / `password`. Keep these environments local.

### Updating an existing installation

When pulling this WordPress upgrade into an existing checkout, run `SHOWCASE_RUNTIME=php npm run demo:update` for PHP, or `npm run demo:update` for Docker. This updates WordPress in both sites and runs their database upgrades without reseeding content. The before theme/plugin source remains the historical extraction in `.showcase/before/`.

For the new Breadcrumbs example, follow its [build and feature-only seed instructions](docs/breadcrumbs/README.md#add-this-feature-to-an-existing-installation).

### Daily use

Start the existing sites with your chosen runtime. This reuses their databases and uploads without rebuilding the themes or reseeding the content, preserving your saved edits.

| Action | Docker (default) | PHP/SQLite |
| --- | --- | --- |
| Start existing sites | `npm run demo:start` | `SHOWCASE_RUNTIME=php npm run demo:start` |
| Stop sites; keep their data | `npm run demo:stop` | `SHOWCASE_RUNTIME=php npm run demo:stop` |
| Restore fictional demo content | `npm run demo:seed` | `SHOWCASE_RUNTIME=php npm run demo:seed` |
| Run WordPress integration checks | `npm run demo:check` | `SHOWCASE_RUNTIME=php npm run demo:check` |

To add or restore only Logo Slider without resetting Grid edits, use `SHOWCASE_RUNTIME=php npm run demo:seed:logo-slider` for PHP, or `npm run demo:seed:logo-slider` for Docker. See the [feature guide](docs/logo-slider/README.md#add-this-example-to-an-existing-demo-installation) for the build step when upgrading an existing checkout.

To add or restore only Video Modal while keeping your other feature edits, use `SHOWCASE_RUNTIME=php npm run demo:seed:video-modal` for PHP, or `npm run demo:seed:video-modal` for Docker. See its [feature guide](docs/video-modal/README.md#add-this-example-to-an-existing-demo-installation) for the build step.

To add or restore only Table of Contents, use `SHOWCASE_RUNTIME=php npm run demo:seed:toc` for PHP, or `npm run demo:seed:toc` for Docker. Its [feature guide](docs/table-of-contents/README.md) covers the in-house origins, later extensions, and both current examples.

`demo:seed` updates the showcase-owned records without creating duplicates. It overwrites edits to the fictional demo records and restores the showcase home-page settings.

If wp-env asks whether to destroy an environment previously started with a different runtime, answer **n** to keep it, then rerun the command with the correct runtime. Switching runtimes requires destroying the existing environment, so treat it as a reset of that environment's data.

### Rebuild and verify

After editing the after-state theme source, run `npm run build` to rebuild its assets. These commands do not require a runtime prefix:

```sh
npm run build
npm test
npm run lint:php
npx playwright install chromium  # once, if Chromium is not already installed
npm run test:browser             # both demo sites must already be running
```

`demo:prepare` exports the baseline tag into ignored `.showcase/before` and builds each state independently, without starting or reseeding the sites. That folder holds the historical theme/plugin source and build dependencies. `.showcase/cache` holds the separate WordPress installations, databases, and uploads.

Fetch tags if using a shallow clone: `git fetch --tags`. No production packages are installed or replaced. Generated dependencies, bundles, databases and uploads are not tracked.

See [Local setup](docs/local.md), [provenance](docs/provenance.json), and [publication/attribution notes](NOTICE.md).

Verification evidence and remaining tooling limitations are recorded in [verification](docs/verification.md). The extracted historical implementation and verified demo have separate tags so compatibility fixes are easy to distinguish.
