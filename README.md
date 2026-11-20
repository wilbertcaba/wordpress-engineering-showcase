# WordPress Engineering Showcase

Selected WordPress theme and plugin features showcasing custom Gutenberg blocks, component extensions, and practical engineering decisions.

## Practice Areas Grid

Two isolated WordPress sites demonstrate Variation 1 with **Display Settings → Variation → Cover** before the extension, and Variation 5 afterward. The before runtime uses a tagged extraction of the original code; it does not share the after editor implementation.

Source is vendored as focused, attributed extracts. Running the demo needs no access to the private repositories. This is a wp-content repository, not a WordPress core installation.

### Quick start

Use Node 24.20.0, npm 11, PHP 8.2+, and Docker Desktop (running):

```sh
npm ci
npm run demo:setup
```

Open [before](http://localhost:8888) and [after](http://localhost:8890). Local-only wp-env login: `admin` / `password`. Keep these environments local.

```sh
npm run demo:seed    # restore fictional demo records; run twice without duplicates
npm run demo:check   # WordPress integration checks in both environments
npm test
npm run lint:php
npm run test:browser
npm run demo:stop
```

`demo:prepare` exports the baseline tag into ignored `.showcase/before` and builds each state independently. Fetch tags if using a shallow clone: `git fetch --tags`. No production packages are installed or replaced. Generated dependencies, bundles, databases and uploads are not tracked.

See [Local setup](docs/local.md), [case study](docs/practice-areas-grid.md), [provenance](docs/provenance.json), and [publication/attribution notes](NOTICE.md).
