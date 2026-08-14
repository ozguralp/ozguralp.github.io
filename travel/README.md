# Travel Notes maintenance

`data.json` and `gmaps_reviews.json` are the canonical content sources. Generated post pages,
country pages, and `sitemap.xml` are produced by `generator/generate.py` using the templates
under `generator/templates/`.

## Safe workflow

1. Edit the JSON content or generator templates.
2. Run `./generator/generate` to render and validate in a temporary directory.
3. Run `./generator/generate --write` to update the deploy-ready HTML and sitemap.
4. From the webapps root, run `./scripts/verify` before manually uploading the site.

The generator preserves existing sitemap `lastmod` values. New URLs use today's date unless
`--new-lastmod YYYY-MM-DD` is supplied.

`generator/config/countries.json` stores country names, flags, and map bounds.
`generator/config/review_countries.json` stores the stable country assignment of place reviews.
Rebuild those files only when the country-page model itself changes:

```bash
./generator/generate --bootstrap-config
```

Running the generator without `--write` never changes deploy-ready site files.
