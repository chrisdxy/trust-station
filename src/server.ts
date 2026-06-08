// 必须在导入 next 之前设置，禁用 Turbopack
process.env.NEXT_DISABLE_TURBOPACK = '1';

import { createServer } from 'http';
import { parse } from 'url';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

async function main() {
  // 使用当前工作目录作为项目根目录
  // PM2 ecosystem.config.js 中设置 cwd 为 /root，确保能找到 .next/ 目录
  const next = (await import('next')).default;
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err: any) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`
    );
  });
}

main();
