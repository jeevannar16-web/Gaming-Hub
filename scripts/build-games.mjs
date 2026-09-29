/**
 * Builds every game in `/games/*` and stages its static output into the
 * hub's `public/` folder so `vite build` bundles them as-is.
 *
 * Each game is an independent Vite app with its own `index.html`, so it is
 * served as a separate static app under `public/games/<name>/`.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const gamesDir = join(root, 'games')
const publicGamesDir = join(root, 'public', 'games')

/** Rewrite a root-relative reference (e.g. /favicon.svg) to a relative one
 *  when the target asset ships beside the game's own index.html. Elsewhere
 *  references stay untouched (Vite already prefixes them with the base URL). */
function relativizeLocalAssets(html, baseDir) {
  if (!html.includes('="/') && !html.includes("='/")) return html
  return html.replace(/\b(href|src)="\/([^"]*)"/g, (m, attr, ref) => {
    if (ref.startsWith('/') || ref.startsWith('http') || ref.startsWith('//')) return m
    return existsSync(join(baseDir, ref)) ? `${attr}="${ref}"` : m
  })
}

/** Append a small fixed "back to hub" chip to a game's built index.html. */
function injectBackChip(html) {
  const chip = `
<style>
  #hub-back{position:fixed;top:14px;left:14px;z-index:99999;display:inline-flex;align-items:center;gap:8px;
    padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);
    background:rgba(11,11,26,.72);backdrop-filter:blur(10px);color:#e8e8ff;
    font:600 13px/1 'Segoe UI',system-ui,sans-serif;text-decoration:none;
    box-shadow:0 4px 18px rgba(0,0,0,.35);transition:transform .15s ease,box-shadow .15s ease;
    -webkit-user-select:none;user-select:none}
  #hub-back:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(0,0,0,.5)}
  #hub-back svg{width:14px;height:14px;stroke:#34f5ff}
</style>
<a id="hub-back" href="../../" aria-label="Back to Neon Arcade">
  <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  BACK TO ARCADE
</a>`
  return html.replace('</body>', `${chip}\n</body>`)
}

async function buildGame(name) {
  const gameRootDir = join(gamesDir, name)
  const distDir = join(gameRootDir, 'dist')
  const outDir = join(publicGamesDir, name)

  if (!existsSync(join(gameRootDir, 'node_modules'))) {
    console.log(`[hub] installing ${name} dependencies…`)
    execSync('npm install --no-audit --no-fund', { cwd: gameRootDir, stdio: 'inherit' })
  }

  console.log(`[hub] building ${name}…`)
  execSync('npm run build', { cwd: gameRootDir, stdio: 'inherit' })

  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })
  await cp(distDir, outDir, { recursive: true })
  console.log(`[hub] staged ${name} -> public/games/${name}`)

  // Post-process the staged app: relativize local favicon link + add back chip.
  const htmlPath = join(outDir, 'index.html')
  if (existsSync(htmlPath)) {
    let html = await readFile(htmlPath, 'utf8')
    html = relativizeLocalAssets(html, outDir)
    html = injectBackChip(html)
    await writeFile(htmlPath, html)
  }

  // Drop Netlify-only extras; they are noise for the hub's static hosting.
  for (const extra of ['_headers', '_redirects']) {
    const p = join(outDir, extra)
    if (existsSync(p)) await rm(p, { force: true })
  }
}

await rm(publicGamesDir, { recursive: true, force: true })
await mkdir(publicGamesDir, { recursive: true })
await buildGame('pickora')
console.log('[hub] games ready.')