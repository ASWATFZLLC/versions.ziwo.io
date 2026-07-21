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

**`all.json` is the single source of truth.** Everything else (`<app>.json`, `<app>.xml`, `all.xml`) is generated from it by `build.js` at deploy time.

1. Edit `all.json` only.
2. Commit to `main` (directly or via PR).
3. The `Build and deploy manifests` workflow regenerates and publishes the site; live in about a minute.

Verify:

```sh
curl -s https://versions.ziwo.io/mobile.json | jq .
```

## Adding a new app

Add a key to `all.json`:

```json
{
  "mobile": { "minimum": "1.5.0", "latest": "3.0.0" },
  "desktop": { "minimum": "1.0.0", "latest": "1.0.0" }
}
```

`/desktop.json` and `/desktop.xml` appear on the next deploy; the landing page picks up new apps automatically.

## Local build

```sh
node build.js   # writes _site/, fails on malformed versions
```

## Hosting

- GitHub Pages via the `Build and deploy manifests` workflow (source: GitHub Actions).
- Custom domain `versions.ziwo.io` set in Pages settings; DNS is a CNAME record `versions` → `aswatfzllc.github.io`.
- `404.html` serves a branded page for unknown paths.
- Content types come from file extensions — GitHub Pages offers no header control, so manifests must keep their `.json`/`.xml` extensions.

Maintained by the Infrastructure Team.
