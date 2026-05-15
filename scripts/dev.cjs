const { spawn, execSync } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 5000;
const root = path.resolve(__dirname, '..');
const nextCmd = path.join(root, 'node_modules', '.bin', 'next.cmd');

console.log(`Next.js 15.x 默认使用 Webpack（无 Turbopack）`);
console.log(`Next CLI: ${nextCmd}`);

// 清除端口 5000
console.log(`清除端口 ${PORT}...`);
try {
  const out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8', stdio: ['pipe','pipe','ignore'] });
  for (const line of out.split('\n')) {
    if (!line.includes('LISTEN')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid)) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch(e) {}
    }
  }
} catch(e) {}
sleep(2000);
console.log('端口已清除');

// 构建干净的环境变量（去掉污染的 NODE_OPTIONS）
const env = {};
for (const k in process.env) {
  if (k === 'NODE_OPTIONS') continue;
  env[k] = process.env[k];
}
env.PORT = String(PORT);
const sysDir = 'C:\\Program Files\\nodejs';
const npmBin = path.join(root, 'node_modules', '.bin');
env.PATH = sysDir + ';' + npmBin + ';' + (process.env.PATH || '');

console.log(`正在启动开发服务器 (next dev -p ${PORT})...`);
const child = spawn(`"${nextCmd}" dev -p ${PORT}`, {
  cwd: root,
  env: env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code || 0));

function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {}
}
