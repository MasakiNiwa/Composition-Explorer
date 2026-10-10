/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

function gitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

// `base: './'` keeps the build relocatable: the same bundle works on GitHub Pages
// (/Composition-Explorer/) and when served from a Google Colab kernel port.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __GIT_SHA__: JSON.stringify(gitSha()),
  },
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
