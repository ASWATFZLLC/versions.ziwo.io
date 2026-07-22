#!/usr/bin/env node
// Self-check for build.js. Run: node test.js
// Builds the real site, verifies every endpoint round-trips against versions.json,
// then feeds build.js malformed manifests and asserts it rejects each one.
'use strict';
const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = __dirname;
const BUILD = path.join(ROOT, 'build.js');

// --- Build the real site ----------------------------------------------------
execFileSync(process.execPath, [BUILD], { cwd: ROOT, stdio: 'pipe' });

const site = (f) => path.join(ROOT, '_site', f);
const readJson = (f) => JSON.parse(fs.readFileSync(site(f), 'utf8'));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'versions.json'), 'utf8'));
const { schema_version: schemaVersion, ...apps } = manifest;

// Tiny XML reader for the shapes we emit: nested elements, leaf = {minimum, latest}.
function parseXml(xml) {
  const tokens = xml.replace(/<\?xml[^?]*\?>/, '').match(/<\/?[^>]+>|[^<>\s][^<]*/g);
  const stack = [{}];
  const names = [];
  for (const t of tokens) {
    if (t.startsWith('</')) {
      names.pop();
      stack.pop();
    } else if (t.startsWith('<')) {
      const name = t.slice(1, -1).split(/\s/)[0];
      const node = {};
      stack[stack.length - 1][name] = node;
      stack.push(node);
      names.push(name);
    } else {
      const leafName = names[names.length - 1];
      const parent = stack[stack.length - 2];
      parent[leafName] = t.trim();
    }
  }
  assert.strictEqual(names.length, 0, 'unbalanced XML tags');
  return stack[0];
}

// all.json is versions.json byte-for-byte
assert.strictEqual(
  fs.readFileSync(site('all.json'), 'utf8'),
  fs.readFileSync(path.join(ROOT, 'versions.json'), 'utf8'),
  'all.json must be versions.json verbatim'
);

// Per-app endpoints round-trip
for (const [app, node] of Object.entries(apps)) {
  assert.deepStrictEqual(readJson(`${app}.json`), node, `${app}.json mismatch`);
  const xml = fs.readFileSync(site(`${app}.xml`), 'utf8');
  assert.ok(!xml.includes('undefined'), `${app}.xml contains "undefined"`);
  assert.deepStrictEqual(parseXml(xml), { [app]: node }, `${app}.xml mismatch`);
}

// all.xml mirrors every app
const allXml = fs.readFileSync(site('all.xml'), 'utf8');
assert.ok(!allXml.includes('undefined'), 'all.xml contains "undefined"');
assert.deepStrictEqual(parseXml(allXml), { versions: apps }, 'all.xml mismatch');
assert.ok(allXml.includes(`schema_version="${schemaVersion}"`), 'all.xml missing schema_version');

// meta.json
const meta = readJson('meta.json');
assert.strictEqual(meta.schema_version, schemaVersion);
assert.ok(!Number.isNaN(Date.parse(meta.generated_at)), 'meta.generated_at not a date');

// schema_version must not leak as an endpoint; static pages must be copied
assert.ok(!fs.existsSync(site('schema_version.json')), 'schema_version.json must not exist');
assert.ok(!fs.existsSync(site('schema_version.xml')), 'schema_version.xml must not exist');
for (const f of ['index.html', '404.html']) assert.ok(fs.existsSync(site(f)), `${f} missing`);

// --- Malformed manifests must be rejected ------------------------------------
const leaf = { minimum: '1.0.0', latest: '2.0.0' };
const bad = {
  'bad semver': { schema_version: '1.0.0', app: { minimum: '1.0', latest: '2.0.0' } },
  'minimum newer than latest': { schema_version: '1.0.0', app: { minimum: '3.0.0', latest: '2.0.0' } },
  'uppercase key': { schema_version: '1.0.0', App: leaf },
  'reserved app name': { schema_version: '1.0.0', all: leaf },
  'extra leaf key': { schema_version: '1.0.0', app: { ...leaf, beta: '9.9.9' } },
  'empty group': { schema_version: '1.0.0', app: {} },
  'no apps': { schema_version: '1.0.0' },
  'missing schema_version': { app: leaf },
  'array node': { schema_version: '1.0.0', app: [leaf] },
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'versions-test-'));
try {
  for (const f of ['index.html', '404.html']) fs.writeFileSync(path.join(tmp, f), '<!doctype html>');
  for (const [name, m] of Object.entries(bad)) {
    fs.writeFileSync(path.join(tmp, 'versions.json'), JSON.stringify(m));
    assert.throws(
      () => execFileSync(process.execPath, [BUILD], { cwd: tmp, stdio: 'pipe' }),
      `build.js accepted manifest with ${name}`
    );
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('test.js: all checks passed');
