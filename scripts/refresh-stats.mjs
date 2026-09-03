// Recount every metric from the sibling checkouts, by the same commands the
// `how` strings on the site name, and write the values back into the content
// records with today's date. Development only; the build never runs this.
//
//   npm run stats            recount and rewrite
//   npm run stats -- --dry   recount and report, write nothing

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECTS = resolve(process.env.PROJECTS_DIR ?? '../../');
const DRY = process.argv.includes('--dry');
const TODAY = new Date().toISOString().slice(0, 10);

/** Where each record's checkout is, relative to PROJECTS_DIR. */
const DIRS = {
  'ai-usage-tui': 'ai-usage-tui',
  'marquee-markdown': 'md-viewer',
  'json-data-drift-analyzer': 'json-data-drift-analyzer',
  compiled: 'tech-news',
  otacli: 'otacli',
  streakly: 'streakly',
  oneplusone: 'games/oneplusone',
  'brick-breaker': 'games/brick-breaker',
  algebraic: 'games/algebraic',
};

const sh = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', shell: '/bin/bash', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** The command for a label, in the same words the site shows. */
function count(label, dir, ref) {
  const at = ref ? `git -c advice.detachedHead=false stash -q 2>/dev/null; ` : '';
  void at;
  switch (true) {
    case label === 'tests' && existsSync(`${dir}/Cargo.toml`):
      return Number(sh("grep -rhoE '#\\[(tokio::)?test\\]' src tests | wc -l", dir));
    case label === 'tests' && existsSync(`${dir}/pyproject.toml`):
      return Number(sh("grep -c 'def test_' tests/*.py | awk -F: '{s+=$2} END {print s}'", dir));
    case label === 'test assertions':
      return Number(sh("git ls-files | grep -E '\\.(test|spec)\\.tsx?$' | xargs grep -hoE '\\bexpect\\(' | wc -l", dir));
    case label === 'test files':
      return Number(sh("git ls-files | grep -cE '\\.(test|spec)\\.tsx?$'", dir));
    case label === 'lines of Rust':
      return Number(sh("git ls-files 'src/*.rs' | xargs cat | wc -l", dir));
    case label === 'lines of TypeScript':
      return Number(sh("git ls-files 'src/*.ts' 'src/*.tsx' | xargs cat | wc -l", dir));
    case label === 'lines of Python':
      return Number(sh("git ls-files 'compiled/*.py' | xargs cat | wc -l", dir));
    case label === 'lines of tests':
      return Number(sh("git ls-files 'tests/*.py' | xargs cat | wc -l", dir));
    case label === 'commits':
      return Number(sh('git rev-list --count HEAD', dir));
    case label === 'sources':
      return Number(sh("grep -cE '^\\s*Source\\(' compiled/sources.py", dir));
    case label === 'releases': {
      const repo = sh('git remote get-url origin', dir).match(/SophanaSok\/([\w.-]+?)(?:\.git)?$/)[1];
      return Number(sh(`gh api repos/SophanaSok/${repo}/releases --jq length`, dir));
    }
    default:
      return null;
  }
}

function version(dir) {
  if (existsSync(`${dir}/Cargo.toml`)) return readFileSync(`${dir}/Cargo.toml`, 'utf8').match(/^version = "([^"]+)"/m)?.[1];
  if (existsSync(`${dir}/pyproject.toml`)) return readFileSync(`${dir}/pyproject.toml`, 'utf8').match(/^version = "([^"]+)"/m)?.[1];
  if (existsSync(`${dir}/package.json`)) return JSON.parse(readFileSync(`${dir}/package.json`, 'utf8')).version;
  return undefined;
}

let changed = 0;
for (const [id, rel] of Object.entries(DIRS)) {
  const file = resolve('src/content/projects', `${id}.json`);
  const dir = resolve(PROJECTS, rel);
  if (!existsSync(file) || !existsSync(dir)) {
    console.log(`${id}: skipped (${existsSync(file) ? 'no checkout at ' + dir : 'no record'})`);
    continue;
  }
  const record = JSON.parse(readFileSync(file, 'utf8'));
  const tag = record.version ? `v${record.version}` : null;
  for (const m of record.metrics) {
    const value = count(m.label, dir, tag);
    if (value === null) {
      console.log(`${id}: ${m.label}: no counter for this label, left at ${m.value}`);
      continue;
    }
    if (value !== m.value) {
      console.log(`${id}: ${m.label}: ${m.value} -> ${value}`);
      m.value = value;
      changed += 1;
    }
  }
  const v = version(dir);
  if (v && record.version && v !== record.version) {
    console.log(`${id}: version ${record.version} -> ${v}; the 'how' strings still name the old tag, update them by hand`);
    record.version = v;
    changed += 1;
  }
  record.verifiedOn = TODAY;
  if (!DRY) writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
}
console.log(DRY ? `dry run: ${changed} value(s) would change` : `${changed} value(s) changed; verifiedOn set to ${TODAY}`);
