import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Read-only checks. Content accuracy and deployment status need separate review. */
export function checkRelease(root = projectRoot, expectedVersion) {
  const errors = [];
  const read = (file, json = false) => {
    try {
      const text = readFileSync(resolve(root, file), 'utf8').replace(/^\uFEFF/, '');
      return json ? JSON.parse(text) : text;
    } catch (error) {
      errors.push(`${file}: 読み込み失敗 (${error.code ?? error.name})`);
      return json ? {} : '';
    }
  };
  const manifest = read('package.json', true);
  const lock = read('package-lock.json', true);
  const source = read('src/config/app-version.ts');
  const readme = read('README.md');
  const changelog = read('CHANGELOG.md');
  const version = expectedVersion ?? manifest?.version;
  if (typeof version !== 'string' || !versionPattern.test(version)) {
    errors.push('対象バージョン: 有効なバージョン番号が必要です');
    return { version, errors };
  }
  const matches = (label, values) => {
    if (values.length !== 1 || values[0] !== version) {
      errors.push(`${label}: ${version}を1か所に記載してください (現在: ${values.join(', ') || 'なし'})`);
    }
  };
  matches('package.json version', [manifest?.version]);
  matches('package-lock.json version', [lock?.version]);
  matches('package-lock.json packages[""] version', [lock?.packages?.['']?.version]);
  matches('APP_VERSION', [...source.matchAll(/^\s*export\s+const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/gm)].map(match => match[1]));
  matches('README 最新バージョン', [...readme.matchAll(/^最新バージョン[：:]\s*`([^`]+)`/gm)].map(match => match[1]));
  // Scope current-status assertions; historical releases remain valid references.
  const current = [...readme.matchAll(/現在の公開版は\s*`([^`]+)`/g)].map(match => match[1]);
  if (current.length) matches('README 現在の公開版', current);

  const sections = [...changelog.matchAll(/^##\s+\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/gm)];
  const target = sections.filter(match => match[1] === version);
  if (target.length !== 1) errors.push(`CHANGELOG: [${version}]の日付付き見出しが1つ必要です`);
  if (sections.length && sections[0][1] !== version) errors.push(`CHANGELOG: 最新リリースの見出しを[${version}]にしてください`);
  if (target.length === 1) {
    const date = target[0][2];
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) errors.push('CHANGELOG: リリース日付が不正です');
    const start = target[0].index + target[0][0].length;
    const rest = changelog.slice(start);
    const next = rest.search(/^##\s+/m);
    const body = (next < 0 ? rest : rest.slice(0, next)).replace(/<!--[\s\S]*?-->/g, '');
    const meaningful = body.split(/\r?\n/).some(line => {
      const text = line.trim();
      return text && !text.startsWith('#') && !/^(?:[-*]\s*)?(?:TODO|TBD|未記入|準備中)[。.!！]?$/i.test(text);
    });
    if (!meaningful) errors.push('CHANGELOG: 対象バージョンの変更内容が空です');
  }
  return { version, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let root = projectRoot;
  let expectedVersion;
  let invalid = false;
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!['--root', '--version'].includes(flag) || !value || value.startsWith('--') || seen.has(flag)) {
      invalid = true;
      break;
    }
    seen.add(flag);
    if (flag === '--root') root = resolve(value);
    else expectedVersion = value;
  }
  if (invalid) {
    console.error('Usage: node scripts/check-release.mjs [--root directory] [--version x.y.z]');
    process.exitCode = 2;
  } else {
    const { version, errors } = checkRelease(root, expectedVersion);
    if (errors.length) {
      console.error(errors.map(error => `NG: ${error}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`OK: ${version} のバージョン表記・README・変更履歴は整合しています。`);
      console.log('文章の内容、テスト実行結果、公開状態は別途確認してください。');
    }
  }
}
