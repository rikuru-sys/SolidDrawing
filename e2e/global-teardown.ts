const serverURL = 'http://127.0.0.1:4173/SolidDrawing/__shutdown';

/** Windowsでもテスト用サーバーが残らないよう、E2E終了時に明示的に停止する。 */
export default async function globalTeardown() {
  try {
    await fetch(serverURL, { method: 'POST' });
  } catch {
    // サーバーがすでに停止している場合は追加の処理を必要としない。
  }
}
