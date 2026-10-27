#!/usr/bin/env node
// Copies the starter (every git-tracked file of the repo) into ./template before packing.
// Runs from `prepack`, so `npm pack` / `npm publish` always ship the current commit's files.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const target = join(here, 'template');

// Repo files that belong to the starter repo itself, not to a generated project
const EXCLUDED = [/^create\//, /^bun\.lock$/, /^LICENSE$/];

// npm drops .gitignore files from packages; the CLI renames these back
const RENAMED = { '.gitignore': '_gitignore' };

const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && !EXCLUDED.some((pattern) => pattern.test(file)));

rmSync(target, { recursive: true, force: true });

for (const file of files) {
  const dest = join(target, RENAMED[file] ?? file);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(root, file), dest);
}

console.log(`template: ${files.length} files copied`);
