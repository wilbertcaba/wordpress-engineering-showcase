# Two disposable Local sites

Create two **new, single-site** WordPress sites in Local: `showcase-before` and `showcase-after`. Use PHP 8.2 and WordPress 7.0.9 for parity. Never point the scripts at an existing client site.

Run `npm ci` and `npm run demo:prepare` from the showcase checkout first. This builds the after source and exports/builds the before tag.

From the showcase checkout, link only the required packages into each new site's wp-content directory:

```sh
npm run local:link -- before "/absolute/path/to/showcase-before/app/public"
npm run local:link -- after "/absolute/path/to/showcase-after/app/public"
```

The script creates theme/plugin symlinks and copies the small MU loader. It refuses to replace existing package directories or a different loader. Do not replace a site's entire wp-content directory.

| Site | Package source |
| --- | --- |
| Before | `<showcase>/.showcase/before` |
| After | `<showcase>` |

Open each site's **Local Site Shell**, then run these commands with the absolute showcase checkout path substituted:

```sh
wp theme activate pmp-theme
wp eval-file /absolute/path/to/wordpress-engineering-showcase/scripts/seed.php
wp eval-file /absolute/path/to/wordpress-engineering-showcase/tests/integration.php
```

The seed detects the loaded theme's pattern files to select before or after. Run it twice and confirm eight practice areas remain. Visit the site's home page and edit the seeded page. Both sites must have independent databases and uploads. Delete only these disposable sites when finished.

For browser checks against Local domains:

```sh
BEFORE_URL=http://showcase-before.local AFTER_URL=http://showcase-after.local npm run test:browser
```

The integration checks require the pinned WordPress 7.0.9 version. Use that release in both sites; a newer Local default is not evidence for the pinned runtime.
