#!/usr/bin/env node
// Generates the deployable site into _site/ from the single source of truth: versions.json
//
// versions.json shape:
//   { "schema_version": "x.y.z", "<app>": <node>, ... }
//   <node> is either a leaf {"minimum": "x.y.z", "latest": "x.y.z"}
//   or a group of platform keys, e.g. {"android": <leaf>, "ios": <leaf>}.
//
// Served endpoints: all.json (versions.json verbatim), all.xml, meta.json,
// and per app: <app>.json, <app>.xml. XML mirrors the JSON nesting.
'use strict';
const fs = require('fs');

const SEMVER = /^\d+\.\d+\.\d+$/;
// Keys become XML element names and URL path segments — restrict to safe slugs.
// XML names must not start with a digit or the literal string "xml".
const KEY = /^(?!xml)[a-z][a-z0-9_-]*$/;
// Names that would collide with static files / aggregate endpoints.
const RESERVED = new Set(['all', 'index', 'meta', 'schema_version']);

function fail(msg) {
  throw new Error(msg);
}

function compareSemver(a, b) {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

const isLeaf = (v) => v !== null && typeof v === 'object' && ('minimum' in v || 'latest' in v);

function validateLeaf(path, v) {
  const keys = Object.keys(v).sort();
  if (keys.join(',') !== 'latest,minimum') {
    fail(`${path}: expected exactly {"minimum", "latest"}, got {${Object.keys(v).join(', ')}}`);
  }
  for (const k of ['minimum', 'latest']) {
    if (typeof v[k] !== 'string' || !SEMVER.test(v[k])) {
      fail(`${path}.${k}: must be "x.y.z", got ${JSON.stringify(v[k])}`);
    }
  }
  if (compareSemver(v.minimum, v.latest) > 0) {
    fail(`${path}: minimum ${v.minimum} is newer than latest ${v.latest}`);
  }
}

function validateNode(path, v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    fail(`${path}: must be an object`);
  }
  if (isLeaf(v)) return validateLeaf(path, v);
  const entries = Object.entries(v);
  if (entries.length === 0) fail(`${path}: empty object`);
  for (const [key, child] of entries) {
    if (!KEY.test(key)) fail(`${path}.${key}: invalid key, want ${KEY}`);
    validateNode(`${path}.${key}`, child);
  }
}

// --- Load and validate -----------------------------------------------------
const raw = fs.readFileSync('versions.json', 'utf8');
const manifest = JSON.parse(raw);
if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
  fail('versions.json: root must be an object');
}
const { schema_version: schemaVersion, ...apps } = manifest;
if (typeof schemaVersion !== 'string' || !SEMVER.test(schemaVersion)) {
  fail(`schema_version: must be "x.y.z", got ${JSON.stringify(schemaVersion)}`);
}
if (Object.keys(apps).length === 0) fail('versions.json: no apps defined');
for (const [app, node] of Object.entries(apps)) {
  if (!KEY.test(app) || RESERVED.has(app)) fail(`${app}: invalid or reserved app name`);
  validateNode(app, node);
}

// --- Emit ------------------------------------------------------------------
// Keys and versions are validated against KEY/SEMVER above, so no XML escaping is needed.
function toXml(v, indent) {
  if (isLeaf(v)) {
    return `${indent}<minimum>${v.minimum}</minimum>\n${indent}<latest>${v.latest}</latest>`;
  }
  return Object.entries(v)
    .map(([k, child]) => `${indent}<${k}>\n${toXml(child, indent + '  ')}\n${indent}</${k}>`)
    .join('\n');
}

fs.rmSync('_site', { recursive: true, force: true });
fs.mkdirSync('_site');

for (const f of ['index.html', '404.html']) fs.copyFileSync(f, `_site/${f}`);
fs.copyFileSync('versions.json', '_site/all.json');

for (const [app, node] of Object.entries(apps)) {
  fs.writeFileSync(`_site/${app}.json`, JSON.stringify(node, null, 2) + '\n');
  fs.writeFileSync(
    `_site/${app}.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<${app}>\n${toXml(node, '  ')}\n</${app}>\n`
  );
}

fs.writeFileSync(
  '_site/all.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<versions schema_version="${schemaVersion}">\n` +
    Object.entries(apps)
      .map(([app, node]) => `  <${app}>\n${toXml(node, '    ')}\n  </${app}>`)
      .join('\n') +
    '\n</versions>\n'
);

const meta = {
  schema_version: schemaVersion,
  generated_at: new Date().toISOString(),
  commit: (process.env.GITHUB_SHA || '').slice(0, 7) || undefined,
};
fs.writeFileSync('_site/meta.json', JSON.stringify(meta, null, 2) + '\n');

console.log(`Built _site/: ${fs.readdirSync('_site').sort().join(', ')}`);
