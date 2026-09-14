import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkRelease } from './check-release.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'solid-release-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src/config'), { recursive: true });
  const files = {
    'package.json': JSON.stringify({ version: '0.1.2' }),
    'package-lock.json': JSON.stringify({ version: '0.1.2', packages: { '': { version: '0.1.2' }, dep: { version: '0.1.0' } } }),
    'src/config/app-version.ts': "export const APP_VERSION = '0.1.2';\n",
    'README.md': '最新バージョン：`0.1.2`\n現在の公開版は `0.1.2` です。初回公開版は `0.1.0`。\n',
    'CHANGELOG.md': '# 変更履歴\n\n## [0.1.2] - 2026-09-11\n\n### 修正\n\n- 画像出力を4列に修正\n\n## [0.1.0] - 2026-09-07\n\n初回公開版\n',
  };
  for (const [file, content] of Object.entries(files)) writeFileSync(join(root, file), content);
  return { root, files, write: (file, content) => writeFileSync(join(root, file), content) };
}

test('整合した文書を通し、過去のバージョンと依存ライブラリの番号を許容する', t => {
  const { root, files } = fixture(t);
  assert.deepEqual(checkRelease(root).errors, []);
  for (const [file, content] of Object.entries(files)) assert.equal(readFileSync(join(root, file), 'utf8'), content);
});

for (const [name, file, content, error] of [
  ['画面の番号違い', 'src/config/app-version.ts', "export const APP_VERSION = '0.1.1';", 'APP_VERSION'],
  ['ロックファイル内の番号違い', 'package-lock.json', '{"version":"0.1.2","packages":{"":{"version":"0.1.1"}}}', 'packages[""]'],
  ['README冒頭の番号違い', 'README.md', '最新バージョン：`0.1.1`', 'README 最新'],
  ['README末尾の番号違い', 'README.md', '最新バージョン：`0.1.2`\n現在の公開版は `0.1.0` です。', 'README 現在'],
  ['変更履歴の欠落', 'CHANGELOG.md', '# 変更履歴\n\n## [0.1.1] - 2026-09-08\n旧版', 'CHANGELOG'],
  ['変更履歴の空欄', 'CHANGELOG.md', '## [0.1.2] - 2026-09-11\n### 修正\n<!-- あとで記載 -->\nTODO\n## [0.1.0] - 2026-09-07\n初回公開', '変更内容が空'],
  ['不正な日付', 'CHANGELOG.md', '## [0.1.2] - 2026-02-30\n修正しました', '日付が不正'],
  ['破損JSON', 'package-lock.json', '{broken', '読み込み失敗'],
]) {
  test(name, t => {
    const { root, write } = fixture(t);
    write(file, content);
    assert.ok(checkRelease(root).errors.some(message => message.includes(error)));
  });
}

test('対象バージョンを指定すると全ファイルの更新忘れも検出する', t => {
  const { root } = fixture(t);
  assert.ok(checkRelease(root, '0.1.3').errors.length >= 5);
});

test('同じ版の見出しの重複を検出する', t => {
  const { root, files, write } = fixture(t);
  write('CHANGELOG.md', files['CHANGELOG.md'] + '\n## [0.1.2] - 2026-09-11\n重複\n');
  assert.ok(checkRelease(root).errors.some(message => message.includes('1つ必要')));
});

test('欠落したファイルをエラーとして報告する', t => {
  const { root } = fixture(t);
  rmSync(join(root, 'README.md'));
  assert.ok(checkRelease(root).errors.some(message => message.includes('README.md: 読み込み失敗')));
});

test('CLIは成功0・不整合1・引数誤り2で終了する', t => {
  const { root } = fixture(t);
  const script = fileURLToPath(new URL('./check-release.mjs', import.meta.url));
  const run = args => spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' });
  assert.equal(run([]).status, 0);
  assert.equal(run(['--version', '0.1.3']).status, 1);
  assert.equal(run(['--typo']).status, 2);
});
