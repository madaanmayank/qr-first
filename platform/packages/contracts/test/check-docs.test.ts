import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const pkg = resolve(__dirname, '..');
const realDocs = resolve(pkg, '../../../docs');
const tsx = resolve(pkg, '../../node_modules/.bin/tsx');

function run(docsDir: string) {
  const r = spawnSync(tsx, ['scripts/check-docs.ts'], { cwd: pkg, env: { ...process.env, QR_DOCS_DIR: docsDir }, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

/** A temp copy of the real docs folder with one edit to docs/04. */
function withDoc04(edit: (text: string) => string): string {
  const dir = mkdtempSync(join(tmpdir(), 'qr-docs-'));
  cpSync(realDocs, dir, { recursive: true });
  const file = join(dir, '04-settings-budget.md');
  writeFileSync(file, edit(readFileSync(file, 'utf8')));
  return dir;
}

describe('check-docs fails when docs/04 and the code disagree', () => {
  it('passes against the real docs/04', () => {
    const r = run(realDocs);
    expect(r.out).toContain('check-docs OK');
    expect(r.code).toBe(0);
  });

  it('fails when a setting key is added to the doc but not to the schema', () => {
    const r = run(withDoc04((t) => t.replace('| 18 | `receiptContact` |', '| 18 | `receiptContact` |').replace(/(\| 18 \| `receiptContact`[^\n]*\n)/, '$1| 19 | `brandVoice` | text | none | |\n')));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"brandVoice" is in docs\/04 but not in the code/);
  });

  it('fails when a setting key in the schema is missing from the doc', () => {
    const r = run(withDoc04((t) => t.replace(/\| 17 \| `reviewLink`[^\n]*\n/, '')));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"reviewLink" is in the code but not in docs\/04/);
  });

  it('fails when a feature key is renamed in the doc', () => {
    const r = run(withDoc04((t) => t.replace('`callWaiter`', '`summonWaiter`')));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"summonWaiter" is in docs\/04 but not in the code/);
    expect(r.out).toMatch(/"callWaiter" is in the code but not in docs\/04/);
  });

  it('fails when a feature is added to the doc with no registry entry', () => {
    const r = run(withDoc04((t) => t.replace(/(\| 22 \| `compare`[^\n]*\n)/, '$1| 23 | `karaoke` | Karaoke night | Guests sing | Off |\n')));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"karaoke" is in docs\/04 but not in the code/);
  });

  it('fails when the stated counts or budget are stale', () => {
    expect(run(withDoc04((t) => t.replace('Current count: 22.', 'Current count: 20.'))).out).toMatch(/docs\/04 says 20 features, the registry has 22/);
    expect(run(withDoc04((t) => t.replace('Current count: 18.', 'Current count: 19.'))).out).toMatch(/docs\/04 says 19 settings, the schema has 18/);
    expect(run(withDoc04((t) => t.replace('Budget: 20 maximum', 'Budget: 24 maximum'))).out).toMatch(/budget: docs\/04 says 24/);
  });

  it('fails when an owner-facing feature name or a plain default differs', () => {
    expect(run(withDoc04((t) => t.replace('| Call waiter |', '| Summon a waiter |'))).out).toMatch(/"callWaiter" name is "Call waiter" in code and "Summon a waiter" in docs\/04/);
    const r = run(withDoc04((t) => t.replace('| Off / On / On |\n| 17 | `partySize`', '| On / On / On |\n| 17 | `partySize`')));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"callWaiter" default is false\/true\/true in code and true\/true\/true in docs\/04/);
  });

  it('fails when settings and features lose their order or move group', () => {
    const swapped = withDoc04((t) => {
      const a = /(\| 1 \| `name`[^\n]*\n)(\| 2 \| `address`[^\n]*\n)/.exec(t)!;
      return t.replace(a[0], `${a[2]}${a[1]}`);
    });
    expect(run(swapped).out).toMatch(/same keys, different order/);
  });

  it('exits 2 with a clear message when the docs are not found', () => {
    const r = run('/nonexistent/docs');
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/cannot find/);
  });
});

describe('the reader check', () => {
  it('the manifest lists every registered feature and setting, so a new key without a placeholder fails check-docs and the type check', async () => {
    const { featureReaders, settingReaders } = await import('../readers/readers');
    const { FEATURE_KEYS, SETTING_KEYS } = await import('../src');
    expect(Object.keys(featureReaders).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(Object.keys(settingReaders).sort()).toEqual([...SETTING_KEYS].sort());
  });
  it('the readers test file creates a placeholder test for every registered feature', () => {
    const src = readFileSync(resolve(pkg, 'readers/readers.test.ts'), 'utf8');
    expect(src).toMatch(/for \(const key of FEATURE_KEYS\)/);
    expect(src).toMatch(/it\.todo\(`features\.\$\{key\}/);
  });
});
