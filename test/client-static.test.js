import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STATUSES } from '../lib/store.js'

const here = dirname(fileURLToPath(import.meta.url))
const projectDir = dirname(here)
const clientPath = join(projectDir, 'client.js')
const source = readFileSync(clientPath, 'utf8')

const contractActions = [
  'board',
  'task.add',
  'task.get',
  'task.answer',
  'task.retry',
  'task.stop',
  'task.remove',
  'settings.save',
  'workspace.add',
]

function localeKeys(language) {
  const marker = `\n      ${language}: {`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `the ${language} dictionary was not found`)
  const end = source.indexOf('\n      },', start)
  assert.ok(end > start, `the ${language} dictionary is not terminated`)
  const block = source.slice(start, end)
  const entries = [...block.matchAll(/^\s{8}([A-Za-z][A-Za-z0-9]*):\s*'([^']*)'/gm)]
  return new Map(entries.map(match => [match[1], match[2]]))
}

test('client: node --check accepts the file', () => {
  const checked = spawnSync(process.execPath, ['--check', clientPath], { encoding: 'utf8' })
  assert.equal(checked.status, 0, checked.stderr)
})

test('client: only React is required and only the three allowed services are injected', () => {
  const requires = [...source.matchAll(/\brequire\(\s*([^)]*?)\s*\)/g)].map(match => match[1])
  assert.deepEqual(requires, ["'react'"])
  assert.equal([...source.matchAll(/\brequire\(/g)].length, 1)

  const injectMatch = source.match(/\n      inject: \[([^\]]+)\],/)
  assert.ok(injectMatch, 'the module inject list was not found')
  const inject = [...injectMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1])
  assert.deepEqual(inject, ['slots', 'locale', 'connection'])
})

test('client: registrations match the sidebar/main contract', () => {
  assert.match(source, /window\.__ModuleLoader__\.load\(\{/)
  assert.match(source, /id: '@local\/dsh-local-superagent'/)

  const namespace = source.match(/const NS = '([^']+)'/)
  const panelId = source.match(/const PANEL_ID = '([^']+)'/)
  assert.equal(namespace?.[1], 'localSuperagent')
  assert.equal(panelId?.[1], 'local-superagent')

  assert.match(source, /ctx\.locale\.register\(NS, dictionaries\)/)
  assert.equal([...source.matchAll(/ctx\.slots\.register\(/g)].length, 2)

  assert.match(
    source,
    /ctx\.slots\.register\(\{\s*name: 'main',\s*key: PANEL_ID,\s*locale: NS,\s*inject: \(\) => \(\{\}\)\s*\}, Panel\)/,
  )
  assert.match(
    source,
    /ctx\.slots\.register\(\{\s*name: 'sidebar\.panellist', id: PANEL_ID, order: 15, label: \(\) => bound\('panel'\), locale: NS,\s*\}, SidebarIcon\)/,
  )
  assert.match(source, /function SidebarIcon\(\{ size = 20 \}\)/)
  assert.match(source, /width: size, height: size/)
  assert.match(source, /'aria-hidden': true/)
})

test('client: locale en and zh expose the same non-empty keys', () => {
  const en = localeKeys('en')
  const zh = localeKeys('zh')
  const enKeys = [...en.keys()].sort()
  const zhKeys = [...zh.keys()].sort()
  assert.deepEqual(enKeys, zhKeys)
  assert.ok(enKeys.length >= 150, 'the board dictionary looks unexpectedly small')
  for (const key of enKeys) {
    assert.ok(en.get(key).length > 0, `en.${key} must not be empty`)
    assert.ok(zh.get(key).length > 0, `zh.${key} must not be empty`)
  }
  assert.match(en.get('workspaceCount'), /\{n\}/)
  assert.match(zh.get('workspaceCount'), /\{n\}/)
})

test('client: all API calls use the single same-origin invoke route and contract actions', () => {
  const route = source.match(/const ROUTE = '([^']+)'/)
  assert.equal(route?.[1], 'api/local-superagent/invoke')
  assert.equal([...source.matchAll(/api\/local-superagent\/invoke/g)].length, 1)
  assert.equal([...source.matchAll(/\bfetch\(/g)].length, 1)
  assert.match(source, /fetch\(ROUTE, \{/)
  assert.match(source, /method: 'POST'/)
  assert.match(source, /credentials: 'same-origin'/)
  assert.match(source, /redirect: 'error'/)
  assert.match(source, /'content-type': 'application\/json'/)

  const direct = [...source.matchAll(/\binvoke\('([^']+)'/g)].map(match => match[1])
  const viaRunAction = [...source.matchAll(/\brunAction\([^,]*,\s*'([^']+)'\s*,/g)].map(match => match[1])
  const used = [...new Set([...direct, ...viaRunAction])].sort()
  assert.deepEqual(used, [...contractActions].sort())
})

test('client: status/report/verdict vocabulary matches the Host store and contract', () => {
  const block = name => source.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n    \\}`))?.[1] ?? ''
  const keysOf = text => [...text.matchAll(/['"]?([A-Za-z_]+)['"]?\s*:\s*'[^']+'/g)].map(match => match[1]).sort()

  assert.deepEqual(keysOf(block('STATUS_KEYS')), [...STATUSES].sort())
  assert.deepEqual(keysOf(block('REPORT_KEYS')), ['blocked', 'failed', 'needs_decision', 'ready'])
  assert.deepEqual(keysOf(block('VERDICT_KEYS')), ['continue', 'done', 'fail', 'needs_you'])
})

test('client: no body insertion, iframe, raw HTML or hard-coded colours', () => {
  for (const pattern of [
    /document\.body/,
    /\bappendChild\b/,
    /\biframe\b/i,
    /\binsertAdjacentHTML\b/,
    /\binnerHTML\b/,
    /\bouterHTML\b/,
    /document\.write\b/,
    /document\.createElement\b/,
  ]) {
    assert.doesNotMatch(source, pattern)
  }

  const css = source.match(/const css = `([\s\S]*?)`\n/)?.[1] ?? ''
  assert.ok(css.length > 1000, 'the CSS block was not found')
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/)
  assert.doesNotMatch(css, /\b(?:rgba?|hsla?)\(/i)
  const withoutWhiteSpaceProperty = css.replace(/white-space/g, '')
  assert.doesNotMatch(withoutWhiteSpaceProperty, /\b(?:white|black|red|blue|green|gray|grey|yellow|orange|purple|pink|brown)\b/i)
  assert.match(css, /var\(--dsw-alias-/)
  assert.match(source, /stroke: 'currentColor'/)
})

test('client: every Host error code has a display branch', () => {
  for (const code of ['offline', 'transport', 'forbidden', 'invalid_request', 'unknown_action']) {
    assert.match(source, new RegExp(`case '${code}'`), `missing error branch for ${code}`)
  }
  assert.match(source, /default: return info\.message \|\| t\('errorInternal'\)/)
  assert.match(source, /errorForbidden/)
  assert.match(source, /errorUnknownAction/)
})
