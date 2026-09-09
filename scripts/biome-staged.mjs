import { spawnSync } from 'node:child_process';

const staged = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
  encoding: 'utf8',
});
if (staged.status !== 0) process.exit(staged.status || 1);

const supported = staged.stdout
  .split('\n')
  .map((file) => file.trim())
  .filter((file) => /\.(?:[cm]?[jt]sx?|jsonc?|css)$/i.test(file));

if (!supported.length) process.exit(0);

const result = spawnSync(
  'npx',
  ['biome', 'check', '--write', '--no-errors-on-unmatched', ...supported],
  {
    stdio: 'inherit',
  },
);
if (result.status !== 0) process.exit(result.status || 1);

const restage = spawnSync('git', ['add', '--', ...supported], { stdio: 'inherit' });
process.exit(restage.status || 0);
