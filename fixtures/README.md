# Fictional demo fixtures

The sixteen PNGs are procedural geometric artwork created for this showcase: eight blue diagonal featured images and eight orange diagonal card images. They contain no photographs, client logos, embedded credentials, or licensed stock assets.

The seed script assigns eight fictional practice areas deterministic January 2025 dates, excerpts, independent featured/card attachments, and alternative titles. It identifies its own posts and attachments with `_showcase_key`, leaving other content alone. Re-running restores the fictional records and the showcase home page.

The `logos/` directory contains six fictional logo PNGs with different aspect ratios for the after-only Logo Slider demo. Its dedicated seed command preserves the existing Grid records and home-page settings.

The `video/` directory contains a four-second silent WebM test pattern and a transparent PNG play icon, generated specifically for the after-only Video Modal demo. They contain no client footage or external media. The optional `scripts/generate-video-fixtures.mjs` generator requires ffmpeg; the bundled files can be used without it. The dedicated Video Modal seed command preserves the other feature pages and home-page settings.
