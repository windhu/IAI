// Builds the app for the root path and a sub-directory, then serves both previews for Playwright.
import { execSync } from 'node:child_process';
import { preview } from 'vite';

const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

if (!process.env.E2E_SKIP_BUILD) {
  run('npm run build');
  run('npx vite build --outDir dist-sub', { BASE_PATH: '/carkeeper/' });
}

const root = await preview({ preview: { port: 4173, strictPort: true } });
process.env.BASE_PATH = '/carkeeper/';
const sub = await preview({ base: '/carkeeper/', build: { outDir: 'dist-sub' }, preview: { port: 4174, strictPort: true } });
root.printUrls();
sub.printUrls();
