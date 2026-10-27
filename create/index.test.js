import { afterAll, beforeAll, expect, it } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const here = import.meta.dir;
const workDir = mkdtempSync(join(tmpdir(), 'create-nestkit-'));
const project = join(workDir, 'my-api');

beforeAll(() => {
  execFileSync('node', [join(here, 'copy-template.js')], { stdio: 'ignore' });
  execFileSync('node', [join(here, 'index.js'), project, '--skip-install'], {
    stdio: 'ignore',
  });
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
  rmSync(join(here, 'template'), { recursive: true, force: true });
});

it('copies the starter with a working .gitignore', () => {
  for (const file of [
    'src/main.ts',
    'src/app/AppModule.ts',
    'CLAUDE.md',
    'docs/ARCHITECTURE.md',
    '.husky/pre-commit',
    '.gitignore',
  ]) {
    expect(existsSync(join(project, file))).toBe(true);
  }
  expect(existsSync(join(project, '_gitignore'))).toBe(false);
  expect(existsSync(join(project, 'create'))).toBe(false);
  expect(existsSync(join(project, 'LICENSE'))).toBe(false);
});

it('turns package.json into a private app named after the directory', () => {
  const pkg = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));

  expect(pkg).toMatchObject({
    name: 'my-api',
    version: '0.0.1',
    private: true,
  });
  expect(pkg.license).toBeUndefined();
  expect(pkg.repository).toBeUndefined();
});

it('refuses a non-empty directory', () => {
  const result = spawnSync('node', [join(here, 'index.js'), project], {
    encoding: 'utf8',
  });

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('not empty');
});
