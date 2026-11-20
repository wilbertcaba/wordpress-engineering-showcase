# Two disposable Local sites

Create two **new, single-site** WordPress sites in Local: `showcase-before` and `showcase-after`. Use PHP 8.2 and WordPress 6.8.3 for parity. Never point the scripts at an existing client site.

Run `npm ci` and `npm run demo:prepare` from the showcase checkout first. This builds the after source and exports/builds the before tag.

In each new site's wp-content folder, symlink `themes/pmp-theme` and `mu-plugins/pmp-plugin` to the corresponding directories below. Copy the small `mu-plugins/pmp-loader.php` loader into that site's mu-plugins directory. Do not replace its entire wp-content directory.

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

If Local uses a newer WordPress version, record that as an additional compatibility check rather than evidence for the pinned runtime.
