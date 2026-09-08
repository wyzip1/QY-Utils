import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginUrl = pathToFileURL(path.join(projectRoot, 'dist/index.mjs')).href;

test('builds a multi-page entry with Vite 8', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'vite-plugin-multipage-auto-'));
  const originalCwd = process.cwd();

  try {
    await mkdir(path.join(fixtureRoot, 'src'), { recursive: true });
    await writeFile(
      path.join(fixtureRoot, 'src/main.ts'),
      'document.querySelector("#app").textContent = "Vite 8";\n'
    );

    process.chdir(fixtureRoot);
    const { default: multiPageAuto } = await import(pluginUrl);

    await build({
      root: fixtureRoot,
      logLevel: 'silent',
      plugins: [
        multiPageAuto({
          pageConfig: { index: { title: 'Vite 8 compatible' } }
        })
      ]
    });

    const html = await readFile(path.join(fixtureRoot, 'dist/index.html'), 'utf8');
    assert.match(html, /<title>Vite 8 compatible<\/title>/);
    assert.match(html, /<div id="app"><\/div>/);
    assert.match(html, /<script type="module" crossorigin src="\/assets\/index-[^"]+\.js"><\/script>/);
  } finally {
    process.chdir(originalCwd);
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
