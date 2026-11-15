/**
 * check-docs: fails when docs/04-settings-budget.md and the code disagree.
 *
 * Compares the settings table with the StoreConfig schema, the features table with the
 * feature registry (keys, order, owner-facing names, groups, plain on and off defaults),
 * the stated counts and budget, and the reader manifests with both lists.
 *
 * Run: npm run check-docs   (from platform/)
 * Override the docs folder with QR_DOCS_DIR.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEATURES,
  FEATURE_GROUPS,
  FEATURE_KEYS,
  SETTING_GROUPS,
  SETTING_KEYS,
  SETTINGS_BUDGET,
  type FeatureGroup,
} from '../src';
import { featureReaders, settingReaders } from '../readers/readers';

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = process.env.QR_DOCS_DIR ?? resolve(here, '../../../../docs');
const docPath = resolve(docsDir, '04-settings-budget.md');

const errors: string[] = [];
const fail = (m: string) => errors.push(m);

if (!existsSync(docPath)) {
  console.error(`check-docs: cannot find ${docPath}`);
  process.exit(2);
}
const doc = readFileSync(docPath, 'utf8');

function section(startHeading: RegExp, endHeading: RegExp): string {
  const start = doc.search(startHeading);
  if (start < 0) {
    fail(`docs/04: heading ${startHeading} not found`);
    return '';
  }
  const rest = doc.slice(start + 1);
  const end = rest.search(endHeading);
  return end < 0 ? rest : rest.slice(0, end);
}

function sameList(label: string, docList: string[], codeList: readonly string[]) {
  const missingInCode = docList.filter((k) => !codeList.includes(k));
  const missingInDoc = codeList.filter((k) => !docList.includes(k));
  for (const k of missingInCode) fail(`${label}: "${k}" is in docs/04 but not in the code`);
  for (const k of missingInDoc) fail(`${label}: "${k}" is in the code but not in docs/04`);
  if (missingInCode.length === 0 && missingInDoc.length === 0 && docList.join() !== codeList.join()) {
    fail(`${label}: same keys, different order.\n  docs: ${docList.join(', ')}\n  code: ${codeList.join(', ')}`);
  }
}

/* ----------------------------- Settings ---------------------------------- */

const settingsSection = section(/^## 2\. Settings/m, /^## 3\. Features/m);
const settingRows = [...settingsSection.matchAll(/^\|\s*(\d+)\s*\|\s*`([A-Za-z0-9]+)`\s*\|/gm)];
const docSettings = settingRows.map((m) => m[2]!);
sameList('settings', docSettings, SETTING_KEYS);

settingRows.forEach((m, i) => {
  if (Number(m[1]) !== i + 1) fail(`settings: row "${m[2]}" is numbered ${m[1]}, expected ${i + 1}`);
});

// Group headings: "### Identity and look (5)"
const settingGroupHeads = [...settingsSection.matchAll(/^### (.+?) \((\d+)\)\s*$/gm)];
for (const [, name, count] of settingGroupHeads) {
  const code = SETTING_GROUPS[name!];
  if (!code) fail(`settings: group "${name}" in docs/04 is not in the code`);
  else if (code.length !== Number(count)) fail(`settings: group "${name}" says ${count}, the code has ${code.length}`);
}
for (const name of Object.keys(SETTING_GROUPS)) {
  if (!settingGroupHeads.some((m) => m[1] === name)) fail(`settings: group "${name}" is in the code but not in docs/04`);
}

/* ----------------------------- Features ---------------------------------- */

const featureSection = section(/^## 3\. Features/m, /^## 4\. Presets/m);
const featureRows = [...featureSection.matchAll(/^\|\s*(\d+)\s*\|\s*`([A-Za-z0-9]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$/gm)];
const docFeatures = featureRows.map((m) => m[2]!);
sameList('features', docFeatures, FEATURE_KEYS);

featureRows.forEach((m, i) => {
  const [, num, key, name, , defaults] = m;
  if (Number(num) !== i + 1) fail(`features: row "${key}" is numbered ${num}, expected ${i + 1}`);
  const def = (FEATURES as Record<string, (typeof FEATURES)[keyof typeof FEATURES]>)[key!];
  if (!def) return;
  if (def.name.en !== name) fail(`features: "${key}" name is "${def.name.en}" in code and "${name}" in docs/04`);
  // Plain defaults only. Conditional text ("On once payments are connected") is covered by defaultWhen.
  const triple = /^(On|Off) \/ (On|Off) \/ (On|Off)$/.exec(defaults!);
  if (triple) {
    const want = [triple[1], triple[2], triple[3]].map((x) => x === 'On');
    const got = [def.default.counter, def.default.table, def.default.hybrid];
    if (want.join() !== got.join()) fail(`features: "${key}" default is ${got.join('/')} in code and ${want.join('/')} in docs/04`);
    if (def.defaultWhen) fail(`features: "${key}" has a plain default in docs/04 but a defaultWhen in code`);
  } else if (/^On$/.test(defaults!)) {
    if (!(def.default.counter && def.default.table && def.default.hybrid)) fail(`features: "${key}" is "On" in docs/04 but not on for every preset in code`);
    if (def.defaultWhen) fail(`features: "${key}" has a plain default in docs/04 but a defaultWhen in code`);
  } else if (/^Off$/.test(defaults!)) {
    if (def.default.counter || def.default.table || def.default.hybrid) fail(`features: "${key}" is "Off" in docs/04 but not off for every preset in code`);
  } else if (!def.defaultWhen && !/^On \/ On \/ On \(/.test(defaults!)) {
    fail(`features: "${key}" has a conditional default in docs/04 ("${defaults}") but no defaultWhen in code`);
  } else if (def.defaultWhen === undefined && /^On \/ On \/ On \(/.test(defaults!)) {
    fail(`features: "${key}" has a conditional default in docs/04 but no defaultWhen in code`);
  }
});

const GROUP_BY_HEADING: Record<string, FeatureGroup> = {
  'Ordering and paying': 'ordering_and_paying',
  'Personal and engaging': 'personal_and_engaging',
  'At the table': 'at_the_table',
  'After the meal': 'after_the_meal',
  'Know your food': 'know_your_food',
};
{
  let current: FeatureGroup | undefined;
  for (const line of featureSection.split('\n')) {
    const h = /^### (.+?)\s*$/.exec(line);
    if (h) {
      current = GROUP_BY_HEADING[h[1]!];
      if (!current) fail(`features: group heading "${h[1]}" in docs/04 is not known to check-docs`);
      continue;
    }
    const row = /^\|\s*\d+\s*\|\s*`([A-Za-z0-9]+)`/.exec(line);
    if (row && current) {
      const def = (FEATURES as Record<string, (typeof FEATURES)[keyof typeof FEATURES]>)[row[1]!];
      if (def && def.group !== current) fail(`features: "${row[1]}" is in group ${def.group} in code and ${current} in docs/04`);
    }
  }
  for (const g of FEATURE_GROUPS) if (!Object.values(GROUP_BY_HEADING).includes(g)) fail(`features: group ${g} has no heading in docs/04`);
}

/* ------------------------------ Counts ----------------------------------- */

const settingsHeader = /\*\*Settings:\*\*[^\n]*Budget: (\d+) maximum\. Current count: (\d+)\./.exec(doc);
if (!settingsHeader) fail('docs/04: the settings budget and count line was not found');
else {
  if (Number(settingsHeader[1]) !== SETTINGS_BUDGET) fail(`budget: docs/04 says ${settingsHeader[1]}, the code says ${SETTINGS_BUDGET}`);
  if (Number(settingsHeader[2]) !== SETTING_KEYS.length) fail(`count: docs/04 says ${settingsHeader[2]} settings, the schema has ${SETTING_KEYS.length}`);
}
const featuresHeader = /\*\*Features:\*\*[^\n]*Current count: (\d+)\./.exec(doc);
if (!featuresHeader) fail('docs/04: the features count line was not found');
else if (Number(featuresHeader[1]) !== FEATURE_KEYS.length) fail(`count: docs/04 says ${featuresHeader[1]} features, the registry has ${FEATURE_KEYS.length}`);
if (SETTING_KEYS.length > SETTINGS_BUDGET) fail(`budget: ${SETTING_KEYS.length} settings exceeds the budget of ${SETTINGS_BUDGET}`);

/* ----------------------------- Readers ----------------------------------- */

for (const k of FEATURE_KEYS) if (!(k in featureReaders)) fail(`readers: feature "${k}" has no reader entry or placeholder test in readers/readers.ts`);
for (const k of Object.keys(featureReaders)) if (!FEATURE_KEYS.includes(k as never)) fail(`readers: "${k}" is in readers/readers.ts but is not a registered feature`);
for (const k of SETTING_KEYS) if (!(k in settingReaders)) fail(`readers: setting "${k}" has no reader entry in readers/readers.ts`);
for (const k of Object.keys(settingReaders)) if (!SETTING_KEYS.includes(k as never)) fail(`readers: "${k}" is in readers/readers.ts but is not a setting`);

const platformRoot = resolve(here, '../../..');
for (const [kind, map] of [['feature', featureReaders], ['setting', settingReaders]] as const) {
  for (const [key, entry] of Object.entries(map)) {
    if (entry.status !== 'read') continue;
    const file = resolve(platformRoot, entry.file);
    if (!existsSync(file)) fail(`readers: ${kind} "${key}" claims a reader in ${entry.file}, which does not exist`);
    else if (!readFileSync(file, 'utf8').includes(key)) fail(`readers: ${kind} "${key}" is not mentioned in ${entry.file}`);
  }
}

// The test file must iterate both manifests so a placeholder test exists for every key.
const testSrc = readFileSync(resolve(here, '../readers/readers.test.ts'), 'utf8');
if (!/for \(const key of FEATURE_KEYS\)/.test(testSrc) || !/it\.todo\(`features\./.test(testSrc)) {
  fail('readers: readers/readers.test.ts no longer creates a placeholder test per registered feature');
}

/* ------------------------------ Result ----------------------------------- */

if (errors.length > 0) {
  console.error(`check-docs FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `check-docs OK: ${SETTING_KEYS.length} settings (budget ${SETTINGS_BUDGET}), ${FEATURE_KEYS.length} features, readers listed for all.`,
);
