import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const host = '127.0.0.1';
const port = 4173;
const basePath = '/SolidDrawing/';
const root = resolve('pages-dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${host}:${port}`).pathname;
  const relativePath = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : '';

  if (relativePath === '__shutdown' && request.method === 'POST') {
    response.writeHead(204).end();
    setImmediate(stopServer);
    return;
  }

  const requestedPath = relativePath || 'index.html';
  const filePath = resolve(root, requestedPath);

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not Found');
  }
});

server.listen(port, host);

function stopServer() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
