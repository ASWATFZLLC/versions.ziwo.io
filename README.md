# versions.ziwo.io

Static version manifest for Ziwo client applications, served by GitHub Pages at [versions.ziwo.io](https://versions.ziwo.io).

Clients poll these endpoints to determine the minimum supported and latest available app versions.

## Endpoints

| URL | Format | Scope |
|-----|--------|-------|
| [`/all.json`](https://versions.ziwo.io/all.json) | JSON | All apps + `schema_version` |
| [`/all.xml`](https://versions.ziwo.io/all.xml) | XML | All apps (`schema_version` as attribute) |
| [`/meta.json`](https://versions.ziwo.io/meta.json) | JSON | Build metadata: schema version, build time, commit |
| [`/mobile.json`](https://versions.ziwo.io/mobile.json) | JSON | Mobile app only |
| [`/mobile.xml`](https://versions.ziwo.io/mobile.xml) | XML | Mobile app only |

Per-app endpoints (`/<app>.json`, `/<app>.xml`) exist for every top-level app key in `versions.json`.

Example — `GET /mobile.json`:

```json
{
  "android": {
    "minimum": "1.5.0",
    "latest": "3.0.0"
  },
  "ios": {
    "minimum": "1.5.0",
    "latest": "3.0.0"
  }
}
```

Example — `GET /mobile.xml` (XML mirrors the JSON nesting):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mobile>
  <android>
    <minimum>1.5.0</minimum>
    <latest>3.0.0</latest>
  </android>
  <ios>
    <minimum>1.5.0</minimum>
    <latest>3.0.0</latest>
  </ios>
</mobile>
```

`minimum` — oldest version still allowed to run. `latest` — newest released version.

## Updating versions

**`versions.json` (repo file, served verbatim as `/all.json`) is the single source of truth.** Every other endpoint is generated from it by `build.js` at deploy time.

1. Edit `versions.json` only.
2. Commit to `main` (directly or via PR).
3. The `Build and deploy manifests` workflow validates, regenerates, and publishes the site; live in about a minute.

Verify:

```sh
curl -s https://versions.ziwo.io/mobile.json | jq .
```

## Manifest schema

```json
{
  "schema_version": "1.0.0",
  "<app>": { "minimum": "x.y.z", "latest": "x.y.z" },
  "<app>": {
    "<platform>": { "minimum": "x.y.z", "latest": "x.y.z" }
  }
}
```

`build.js` fails the deploy if any of these rules are broken:

- Versions must be exactly `x.y.z` and `minimum` must not exceed `latest`.
- App/platform keys must match `[a-z][a-z0-9_-]*`, not start with `xml`, and not collide
  with reserved names (`all`, `index`, `meta`, `schema_version`) — keys become URLs and XML element names.
- A leaf must contain exactly `minimum` and `latest`; groups must not be empty.

## Adding a new app

Add a key to `versions.json`:

```json
{
  "schema_version": "1.0.0",
  "mobile": { "…": "…" },
  "desktop": { "minimum": "1.0.0", "latest": "1.0.0" }
}
```

`/desktop.json` and `/desktop.xml` appear on the next deploy; the landing page picks up new apps automatically.

## Local build & test

```sh
node build.js   # writes _site/, fails on malformed versions.json
node test.js    # rebuilds, round-trips every endpoint, checks rejection of bad manifests
```

## Hosting

- GitHub Pages via the `Build and deploy manifests` workflow (source: GitHub Actions).
- Custom domain `versions.ziwo.io` set in Pages settings; DNS is a CNAME record `versions` → `aswatfzllc.github.io`.
- `404.html` serves a branded page listing the real endpoints for unknown paths.
- Content types come from file extensions — GitHub Pages offers no header control, so manifests must keep their `.json`/`.xml` extensions.
