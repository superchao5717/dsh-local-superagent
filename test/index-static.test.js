import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectDir = dirname(here)
const source = readFileSync(join(projectDir, 'index.js'), 'utf8')

test('index: exports the plugin name and declares only the connection service', () => {
  assert.equal(source.match(/export const name = '([^']+)'/)?.[1], 'dsh-local-superagent')
  const inject = [...(source.match(/export const inject = \[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)]
    .map(match => match[1])
  assert.deepEqual(inject, ['connection'])
  assert.match(source, /export function apply\(/)
})

test('index: registers exactly one POST route at the contract path with a buffered body', () => {
  assert.equal([...source.matchAll(/\.fetch\.register\(/g)].length, 1)
  const route = source.match(/const ROUTE = '([^']+)'/)
  assert.equal(route?.[1], '/api/local-superagent/invoke')
  assert.equal([...source.matchAll(/\/api\/local-superagent\/invoke/g)].length, 1)

  const body = source.match(/ctx\.connection\.fetch\.register\(\{([\s\S]*?)\n    \}\)/)?.[1]
  assert.ok(body, 'the fetch registration block was not found')
  assert.match(body, /path:\s*ROUTE/)
  assert.match(body, /methods:\s*\['POST'\]/)
  assert.match(body, /requestBody:\s*'buffered'/)
  assert.match(body, /admit\(request\)/)
  assert.match(body, /principal\.kind !== 'owner'/)
  assert.match(body, /code: 'forbidden'/)
  assert.match(body, /403/)
  assert.match(body, /api\.handle\(args\)/)
})

test('index: route lifecycle is owned by ctx.effect and the cleanup disposes everything', () => {
  const registerIndex = source.indexOf('ctx.connection.fetch.register')
  assert.ok(registerIndex > 0)
  const effectStart = source.lastIndexOf('ctx.effect(', registerIndex)
  assert.ok(effectStart >= 0)
  const effectEnd = source.indexOf('\n  })', registerIndex)
  assert.ok(effectEnd > registerIndex)
  const effectBlock = source.slice(effectStart, effectEnd + 4)
  assert.match(effectBlock, /return \(\) => \{/)
  assert.match(effectBlock, /dispose\?\.\(\)/)
  assert.match(effectBlock, /engine\.stop\(\)/)
  assert.match(effectBlock, /store\.close\(\)/)
})

test('index: boot is awaited before serving and startup failures are logged', () => {
  assert.match(source, /await store\.load\(\)/)
  assert.match(source, /await engine\.start\(\)/)
  assert.match(source, /await ready/)
  assert.match(source, /startup failed/)
  assert.match(source, /requestBody: 'buffered'/)
})
