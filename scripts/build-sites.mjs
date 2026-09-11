import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Avoid cmd.exe quoting: npm.cmd can resolve its own directory incorrectly
// when a bare command name is quoted by the bundled Sites build helper.
const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
let executable = 'npm';
let args = ['run', 'build'];
if (process.platform === 'win32') {
  const npmCli = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].find((candidate) => candidate?.endsWith('.js') && existsSync(candidate));
  if (!npmCli) {
    throw new Error('npm-cli.js was not found. Run this script with npm run build:sites.');
  }
  executable = process.execPath;
  args = [npmCli, ...args];
}
const result = spawnSync(executable, args, {
  cwd: projectDirectory,
  stdio: 'inherit',
  shell: false,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
