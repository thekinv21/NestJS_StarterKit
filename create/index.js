#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const template = join(dirname(fileURLToPath(import.meta.url)), 'template');

const args = process.argv.slice(2);
const skipInstall = args.includes('--skip-install');
const target = args.find((arg) => !arg.startsWith('--'));

if (!target) {
  console.error('Usage: create-nestkit <project-directory> [--skip-install]');
  process.exit(1);
}

const dir = resolve(target);
const name = basename(dir);

// Same rule npm applies to package names
if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
  console.error(
    `"${name}" is not a valid package name: use lowercase letters, digits, "-", "_" or ".".`,
  );
  process.exit(1);
}

if (existsSync(dir) && readdirSync(dir).length > 0) {
  console.error(`${dir} already exists and is not empty.`);
  process.exit(1);
}

cpSync(template, dir, { recursive: true });
renameSync(join(dir, '_gitignore'), join(dir, '.gitignore'));

const pkgPath = join(dir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.name = name;
pkg.version = '0.0.1';
pkg.private = true;
for (const key of [
  'description',
  'author',
  'license',
  'repository',
  'bugs',
  'homepage',
])
  delete pkg[key];
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const has = (cmd) =>
  spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;
const run = (cmd, cmdArgs) =>
  spawnSync(cmd, cmdArgs, { cwd: dir, stdio: 'inherit' }).status === 0;

// Before install: husky's `prepare` script needs a git repository
if (has('git')) run('git', ['init', '-q']);

const hasBun = has('bun');
const installed = !skipInstall && hasBun && run('bun', ['install']);

console.log(`\nCreated ${name} in ${dir}\n\nNext steps:\n  cd ${target}`);
if (!installed) console.log('  bun install');
console.log('  cp .env.example .env\n  bun run start:dev\n');
if (!hasBun)
  console.log('This project uses Bun (https://bun.sh): install it first.\n');
