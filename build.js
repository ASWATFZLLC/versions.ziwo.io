#!/usr/bin/env node
// Generates the deployable site into _site/ from the single source of truth: versions.json
// Served aggregate: all.json, all.xml. Derived per app: <app>.json, <app>.xml.
const fs = require('fs');

const all = JSON.parse(fs.readFileSync('versions.json', 'utf8'));

const semver = /^\d+\.\d+\.\d+$/;
function validateVersion(app, label, versions) {
  if (!semver.test(versions.minimum) || !semver.test(versions.latest)) {
    throw new Error(`${app}${label}: minimum/latest must be x.y.z, got ${JSON.stringify(versions)}`);
  }
}

for (const [app, v] of Object.entries(all)) {
  if (app === 'schema_version') continue;

  if (app === 'mobile') {
    validateVersion(app, ' (android)', v.android);
    validateVersion(app, ' (iOS)', v.iOS);
  } else {
    validateVersion(app, '', v);
  }
}

fs.rmSync('_site', { recursive: true, force: true });
fs.mkdirSync('_site');

for (const f of ['index.html', '404.html']) {
  fs.copyFileSync(f, `_site/${f}`);
}
fs.copyFileSync('versions.json', '_site/all.json');

const xmlBody = (v, indent) =>
  `${indent}<minimum>${v.minimum}</minimum>\n${indent}<latest>${v.latest}</latest>`;

for (const [app, v] of Object.entries(all)) {
  fs.writeFileSync(`_site/${app}.json`, JSON.stringify(v, null, 2) + '\n');
  fs.writeFileSync(
    `_site/${app}.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<${app}>\n${xmlBody(v, '  ')}\n</${app}>\n`
  );
}

fs.writeFileSync(
  '_site/all.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<versions>\n` +
    Object.entries(all)
      .map(([app, v]) => `  <${app}>\n${xmlBody(v, '    ')}\n  </${app}>`)
      .join('\n') +
    `\n</versions>\n`
);

console.log(`Built _site/: ${fs.readdirSync('_site').sort().join(', ')}`);
