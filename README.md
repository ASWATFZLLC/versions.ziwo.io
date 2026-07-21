# versions.ziwo.io

Static version manifest for Ziwo client applications, served by GitHub Pages at [versions.ziwo.io](https://versions.ziwo.io).

Clients poll these endpoints to determine the minimum supported and latest available app versions.

## Endpoints

| URL | Format | Scope |
|-----|--------|-------|
| [`/all.json`](https://versions.ziwo.io/all.json) | JSON | All apps, keyed by app name |
| [`/all.xml`](https://versions.ziwo.io/all.xml) | XML | All apps |
| [`/mobile.json`](https://versions.ziwo.io/mobile.json) | JSON | Mobile app only |
| [`/mobile.xml`](https://versions.ziwo.io/mobile.xml) | XML | Mobile app only |

Example — `GET /mobile.json`:

```json
{
  "minimum": "1.5.0",
  "latest": "3.0.0"
}
```

Example — `GET /all.json`:

```json
{
  "mobile": {
    "minimum": "1.5.0",
    "latest": "3.0.0"
  }
}
```

`minimum` — oldest version still allowed to run. `latest` — newest released version.

## Updating versions

1. Edit the four manifest files and keep them in sync: `mobile.json`, `mobile.xml`, `all.json`, `all.xml`.
2. Commit to `main` (directly or via PR).
3. GitHub Pages redeploys automatically; changes are live in about a minute.

Verify:

```sh
curl -s https://versions.ziwo.io/mobile.json | jq .
```

## Adding a new app

1. Create `<app>.json` and `<app>.xml` (copy the mobile files).
2. Add the app as a key in `all.json` and a node in `all.xml`.
3. Add links on `index.html`. The landing-page table picks up new `all.json` keys automatically.

## Hosting

- GitHub Pages, `main` branch, root directory.
- Custom domain via the `CNAME` file; DNS is a CNAME record `versions` → `aswatfzllc.github.io`.
- `.nojekyll` disables the Jekyll build.
- `404.html` serves a branded page for unknown paths.
- Content types come from file extensions — GitHub Pages offers no header control, so manifests must keep their `.json`/`.xml` extensions.

Maintained by the Infrastructure Team.
