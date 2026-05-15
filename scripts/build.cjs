const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(cmd) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

console.log('Building the Next.js project...');
run('npx next build');

console.log('\nBundling server with tsup...');
run('npx tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify');

console.log('\nBuild completed successfully!');
