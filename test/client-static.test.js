import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STATUSES } from '../lib/store.js'
import vm from 'node:vm'

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
  'models.catalog',
  'superagent.add',
  'superagent.update',
  'superagent.remove',
]

// Execute the actual single-file module with a minimal React hook host. No DOM,
// network, real ledger or plugin install is involved; component callbacks are real.
function clientHarness(initialStates = []) {
  const states = [...initialStates]
  const refs = []
  const calls = []
  let stateIndex = 0
  let refIndex = 0
  const React = {
    Component: class {},
    createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } }),
    Children: { toArray: value => [value].flat(Infinity).filter(Boolean) },
    useState(initial) {
      const index = stateIndex++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial } },
    useEffect() {},
    useCallback: fn => fn,
  }
  let module
  const context = {
    React, console, Intl, Date, Set, Map, AbortSignal,
    window: { __ModuleLoader__: { load: value => { module = value } }, setTimeout: () => 0 },
    fetch: async (route, options) => {
      calls.push({ route, ...JSON.parse(options.body) })
      return { ok: true, json: async () => ({ ok: true, data: { groups: [], superagent: { id: 'new', workspaceId: 'w1' } } }) }
    },
  }
  vm.createContext(context)
  const instrumented = source.replace("    return {\n      inject:", "    globalThis.clientTest = { normalizeBoard, normalizeSettings, ownerTitle, waitingText, scopeTasks, TaskCard, Topbar, TaskEntry, shortModelLabel, AttentionPanel, TaskComposer, SettingsPopover, DetailDrawer, Page, SuperagentManager, dictionaries };\n    return {\n      inject:")
  vm.runInContext(instrumented, context, { filename: clientPath })
  module.factory(name => { assert.equal(name, 'react'); return React })
  return {
    api: context.clientTest, calls, states,
    render(name, props) { stateIndex = 0; refIndex = 0; return context.clientTest[name](props) },
  }
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children)]
}
function component(tree, name) { return nodes(tree).find(node => node.type?.name === name) }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.props?.children) : String(tree ?? '') }
const plain = value => JSON.parse(JSON.stringify(value))

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
  // Include Object.assign extensions, not only the original dictionary blocks.
  const { dictionaries } = clientHarness().api
  const en = new Map(Object.entries(dictionaries.en))
  const zh = new Map(Object.entries(dictionaries.zh))
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

const fixture = {
  workspaces: [{ id: 'w1', title: 'Workspace one' }, { id: 'w2', title: 'Workspace two' }],
  superagents: [
    { id: 'a', workspaceId: 'w1', title: 'Alpha', settings: { maxWorkers: 1, models: { supervisor: { provider: 'p', model: 'alpha' }, workers: [] } } },
    { id: 'b', workspaceId: 'w1', title: 'Beta', settings: { paused: true, autonomy: { enabled: true, waitMinutes: 5 } } },
    { id: 'c', workspaceId: 'w2', title: 'Gamma', settings: {} },
  ],
  tasks: [
    { id: 'qa', superagentId: 'a', workspaceId: 'w1', title: 'Question A', status: 'needs_you', question: { text: 'Which branch?', at: 1000, requiresHuman: false } },
    { id: 'qb', superagentId: 'b', workspaceId: 'w1', title: 'Question B', status: 'needs_you', question: { text: 'Login needed', at: 1000 } },
    { id: 'rc', superagentId: 'c', workspaceId: 'w2', title: 'Running C', status: 'running' },
    { id: 'old', superagentId: 'removed', superagentTitle: 'Archived', workspaceId: 'w1', status: 'done' },
  ],
}
const translate = key => key

function pageHarness(workspace = '', owner = '') {
  const harness = clientHarness()
  const board = harness.api.normalizeBoard({ ...fixture, settingsScope: 'global', settings: { maxWorkers: 2 } })
  // Page's useState order is part of this isolated hook host, not a production API.
  harness.states.push(board, null, false, '', workspace, owner)
  return harness
}

test('client: normalizes per-supervisor settings and legacy boards without inferring ownership', () => {
  const { api } = clientHarness()
  const board = api.normalizeBoard(fixture)
  assert.equal(board.superagents.length, 3)
  assert.equal(board.superagents[0].settings.maxWorkers, 1)
  assert.deepEqual(plain(board.superagents[0].settings.autonomy), { enabled: false, waitMinutes: 30 })
  assert.equal(board.superagents[1].settings.paused, true)
  assert.deepEqual(plain(api.normalizeSettings({ autonomy: { enabled: true, waitMinutes: 2000 } }).autonomy), { enabled: true, waitMinutes: 1440 })
  const legacy = api.normalizeBoard({ tasks: [{ id: 'legacy', workspaceId: 'w1' }], settings: { paused: true } })
  assert.equal(legacy.multiSuperagent, false)
  assert.equal(legacy.superagents.length, 0)
  assert.equal(legacy.tasks[0].superagentId, undefined)
  assert.equal(api.ownerTitle(legacy.tasks[0], board.superagents, translate), 'legacySuperagent')
  assert.equal(api.ownerTitle(board.tasks[3], board.superagents, translate), 'Archived')
  assert.match(api.ownerTitle({ superagentId: 'deleted' }, [], translate), /historicalSuperagent.*deleted/)
  assert.deepEqual(plain(api.scopeTasks(board.tasks, 'w1', 'b')).map(task => task.id), ['qb'])
})

test('client: waiting countdown obeys explicit human gate, pause and one-attempt limit', () => {
  const { api } = clientHarness()
  const settings = api.normalizeSettings({ autonomy: { enabled: true, waitMinutes: 1 } })
  const task = fixture.tasks[0]
  assert.equal(api.waitingText(task, settings, 1001, key => key === 'autonomyCountdown' ? 'review {time}' : key), 'review 0:59')
  assert.equal(api.waitingText(task, settings, 62000, translate), 'autonomyDue')
  assert.equal(api.waitingText(fixture.tasks[1], settings, 1001, translate), 'humanWaiting')
  assert.equal(api.waitingText(task, { ...settings, paused: true }, 1001, translate), 'pausedHint')
  assert.equal(api.waitingText({ ...task, autonomyReviewPending: true, autonomy: { attempted: true } }, settings, 1001, translate), 'autonomyDue')
  assert.equal(api.waitingText(task, api.normalizeSettings({}), 1001, translate), 'humanWaiting')
  assert.equal(api.waitingText({ ...task, autonomy: { attempted: true } }, settings, 1001, translate), 'autonomyAttempted')
})

test('client: global settings work in aggregate or selected scope without a supervisor id; old Hosts cannot write', async () => {
  const harness = pageHarness()
  let tree = harness.render('Page', { t: translate })
  let top = component(tree, 'Topbar')
  assert.equal(top.props.settingsWritable, true)
  assert.equal(top.props.settingsPopover.props.settings.maxWorkers, 2)
  assert.equal(top.props.board.superagents[0].settings.maxWorkers, 2, 'global board.settings wins over old per-supervisor projection')
  assert.equal(top.props.board.superagents[1].settings.paused, false, 'old per-supervisor pause must not override global pause')
  top.props.onToggleSettings()
  tree = harness.render('Page', { t: translate })
  const settings = component(tree, 'Topbar').props.settingsPopover
  await settings.props.onSave({ maxWorkers: 3 })
  await settings.props.onSaveModels({ workers: [] })
  await settings.props.onRefreshModels()
  await component(tree, 'Topbar').props.onTogglePause()
  assert.deepEqual(harness.calls.map(call => call.action), ['settings.save', 'settings.save', 'models.catalog', 'settings.save'])
  for (const call of harness.calls) assert.equal(Object.hasOwn(call, 'superagentId'), false)
  tree = harness.render('Page', { t: translate })
  const catalog = component(tree, 'Topbar').props.settingsPopover.props.catalog
  component(tree, 'SuperagentManager').props.onSelect('b')
  tree = harness.render('Page', { t: translate })
  top = component(tree, 'Topbar')
  assert.equal(top.props.settingsOpen, true, 'task filtering does not close global settings')
  assert.equal(top.props.settingsPopover.props.catalog, catalog, 'task filtering does not reset the global catalog')
  assert.equal(top.props.settingsPopover.props.key, undefined, 'global settings never remount per supervisor')

  const old = clientHarness()
  old.states.push(old.api.normalizeBoard(fixture))
  const oldTree = old.render('Page', { t: translate })
  const oldTop = component(oldTree, 'Topbar')
  assert.equal(oldTop.props.settingsWritable, false)
  assert.match(text(oldTop.props.settingsPopover), /globalSettingsReload/)
  await oldTop.props.onTogglePause()
  assert.equal(old.calls.length, 0)
  const header = clientHarness().render('Topbar', oldTop.props)
  assert.equal(nodes(header).find(node => node.props['aria-label'] === 'globalSettings').props.disabled, false, 'gear explains compatibility even on older Hosts')
})

test('client: waiting tasks stay in the in-progress column and ownership appears on card/detail', () => {
  const harness = pageHarness('w1')
  const tree = harness.render('Page', { t: translate })
  const columns = nodes(tree).filter(node => node.type?.name === 'TaskColumn')
  const running = columns.find(node => node.props.tone === 'running')
  assert.deepEqual(nodes(running).filter(node => node.type?.name === 'TaskCard').map(node => node.props.task.id), ['qa', 'qb'])
  assert.deepEqual(plain(component(tree, 'AttentionPanel').props.tasks.map(task => task.id)), ['qa', 'qb'], 'inline answer panel and in-progress cards both retain waiting tasks')
  const cardProps = component(running, 'TaskCard').props
  const card = harness.render('TaskCard', cardProps)
  assert.match(text(card), /Alpha/)
  assert.match(text(card), /Which branch/)
  assert.match(text(card), /viewDetail/)
  assert.equal(nodes(card).filter(node => node.type?.name === 'StatusChip').length, 1, 'waiting card has one compact status, not repeated badges')
  assert.ok(nodes(card).some(node => node.props.className === 'lsa-waiting'))
  const drawer = clientHarness().render('DetailDrawer', { t: translate, task: { ...cardProps.task, status: 'reviewing', autonomyReviewPending: true }, log: [], busyKey: '' })
  assert.match(text(drawer), /Alpha/)
  assert.ok(nodes(drawer).some(node => node.type === 'textarea'), 'human answer remains available during automatic review')
})

test('client: attention panel reuses answer API, preserves drafts on polling and includes autonomous review', async () => {
  const harness = pageHarness('w1')
  // An automatically reviewing task must still accept the human answer.
  harness.states[0] = { ...harness.states[0], tasks: harness.states[0].tasks.map(task => task.id === 'qb' ? { ...task, status: 'reviewing', autonomyReviewPending: true } : task) }
  let tree = harness.render('Page', { t: translate })
  let panel = component(tree, 'AttentionPanel')
  assert.deepEqual(plain(panel.props.tasks.map(task => task.id)), ['qa', 'qb'])
  panel.props.onAnswerChange('qa', '  Use the feature branch  ')
  panel.props.onAnswerChange('qb', 'My independent draft')
  // Board polling replaces the snapshot but must not initialize/reset drafts.
  harness.states[0] = { ...harness.states[0], tasks: [...harness.states[0].tasks] }
  tree = harness.render('Page', { t: translate })
  panel = component(tree, 'AttentionPanel')
  assert.equal(panel.props.answers.qa, '  Use the feature branch  ')
  assert.equal(panel.props.answers.qb, 'My independent draft')
  const inlineHarness = clientHarness()
  let inline = inlineHarness.render('AttentionPanel', panel.props)
  assert.equal(nodes(inline).find(node => node.props['aria-controls']).props['aria-expanded'], true)
  assert.match(text(inline), /Question A.*Alpha.*Which branch/s)
  assert.equal(nodes(inline).filter(node => node.type === 'textarea').length, 2)
  await nodes(inline).find(node => node.type === 'button' && text(node).includes('submitAnswer')).props.onClick()
  assert.deepEqual(plain(harness.calls.map(({ route, ...payload }) => payload)), [
    { action: 'task.answer', id: 'qa', text: 'Use the feature branch' },
  ])
  tree = harness.render('Page', { t: translate })
  panel = component(tree, 'AttentionPanel')
  assert.equal(panel.props.answers.qa, undefined, 'successful answer clears only its own draft')
  assert.equal(panel.props.answers.qb, 'My independent draft')
  const running = nodes(tree).find(node => node.type?.name === 'TaskColumn' && node.props.tone === 'running')
  assert.deepEqual(nodes(running).filter(node => node.type?.name === 'TaskCard').map(node => node.props.task.id), ['qa', 'qb'])
  inline = inlineHarness.render('AttentionPanel', panel.props)
  const toggle = nodes(inline).find(node => node.props['aria-controls'])
  toggle.props.onClick()
  inline = inlineHarness.render('AttentionPanel', panel.props)
  assert.equal(nodes(inline).find(node => node.props['aria-controls']).props['aria-expanded'], false)
  assert.equal(nodes(inline).find(node => node.props.className === 'lsa-needs-list').props.hidden, true)
  assert.equal(panel.props.answers.qb, 'My independent draft', 'collapse leaves the draft intact')
  harness.states[0] = { ...harness.states[0], tasks: harness.states[0].tasks.map(task => task.id === 'qb' ? { ...task, question: { ...task.question, at: 2000, text: 'A different decision?' } } : task) }
  tree = harness.render('Page', { t: translate })
  panel = component(tree, 'AttentionPanel')
  assert.equal(panel.props.answers.qb, undefined, 'a replacement question must not reuse the previous draft')
  inline = inlineHarness.render('AttentionPanel', panel.props)
  assert.equal(nodes(inline).filter(node => node.type === 'textarea')[1].props.value, '')
  const buttons = nodes(inline).filter(node => node.type === 'button' && text(node).includes('submitAnswer'))
  assert.equal(buttons[1].props.disabled, true, 'old answer cannot be submitted for the new question')
  panel.props.onAnswerChange('qb', 'Draft for question two')
  harness.states[0] = { ...harness.states[0], tasks: harness.states[0].tasks.map(task => task.id === 'qb' ? { ...task, question: { ...task.question, text: 'Changed text at the same timestamp' } } : task) }
  panel = component(harness.render('Page', { t: translate }), 'AttentionPanel')
  assert.equal(panel.props.answers.qb, undefined, 'text-only question changes also invalidate a draft')
})

test('client: inline answering honors Enter/Shift+Enter, busy and failed-submit feedback', async () => {
  const harness = clientHarness()
  const submitted = []
  const props = { t: translate, tasks: [{ ...fixture.tasks[0], superagentTitle: 'Alpha' }], answers: { qa: 'Keep this answer' }, busyKey: '', now: 1001, onOpen() {}, onAnswerChange() {}, onAnswer: async (...args) => { submitted.push(args); return false } }
  let tree = harness.render('AttentionPanel', props)
  let textarea = nodes(tree).find(node => node.type === 'textarea')
  let prevented = 0
  const key = shiftKey => ({ key: 'Enter', shiftKey, nativeEvent: {}, preventDefault: () => { prevented += 1 } })
  await textarea.props.onKeyDown(key(true))
  assert.equal(submitted.length, 0, 'Shift+Enter is a newline')
  await textarea.props.onKeyDown({ ...key(false), nativeEvent: { isComposing: true } })
  await textarea.props.onKeyDown({ ...key(false), isComposing: true })
  assert.equal(submitted.length, 0, 'IME composing Enter never sends an answer')
  await textarea.props.onKeyDown(key(false))
  assert.deepEqual(submitted, [['qa', 'Keep this answer']])
  assert.equal(prevented, 1)
  tree = harness.render('AttentionPanel', props)
  assert.ok(nodes(tree).some(node => node.props.role === 'alert' && text(node) === 'actionFailed'))
  assert.equal(nodes(tree).find(node => node.type === 'textarea').props.value, 'Keep this answer')
  tree = harness.render('AttentionPanel', { ...props, busyKey: 'answer:qa' })
  textarea = nodes(tree).find(node => node.type === 'textarea')
  assert.equal(textarea.props.disabled, true)
  assert.ok(nodes(tree).some(node => node.type === 'button' && text(node).includes('submittingAnswer') && node.props.disabled))
  await textarea.props.onKeyDown(key(false))
  assert.equal(submitted.length, 1, 'in-flight answer cannot submit twice')
})

test('client: task composer rejects mismatched owners and submits explicit matching ownership', async () => {
  const form = { title: 'Task', goal: 'Goal', acceptance: '', priority: 2, workspaceId: 'w1', superagentId: 'c' }
  const harness = clientHarness([form, {}])
  let sent = null
  const props = { t: translate, workspaces: fixture.workspaces, superagents: fixture.superagents, defaultWorkspaceId: 'w1', defaultSuperagentId: '', busyKey: '', open: true, onSubmit: async value => { sent = value; return true } }
  let tree = harness.render('TaskComposer', props)
  const submitButton = value => nodes(value).find(node => node.type === 'button' && text(node).includes('taskSubmit'))
  await submitButton(tree).props.onClick()
  assert.equal(sent, null)
  assert.equal(harness.states[1].superagentId, 'superagentRequired')
  harness.states[0] = { ...form, superagentId: 'b' }
  tree = harness.render('TaskComposer', props)
  await submitButton(tree).props.onClick()
  assert.equal(sent.superagentId, 'b')
  assert.equal(sent.workspaceId, 'w1')
  const ownerSelect = nodes(tree).find(node => node.props.id === 'lsa-task-agent')
  assert.ok(ownerSelect)
  assert.doesNotMatch(text(ownerSelect), /Gamma/)
})

test('client: Superagent create/rename/remove callbacks use contracted payloads', async () => {
  const harness = pageHarness('w1', 'a')
  let tree = harness.render('Page', { t: translate })
  const manager = component(tree, 'SuperagentManager')
  await manager.props.onAdd({ workspaceId: 'w1', title: 'New lead' })
  await manager.props.onRename({ id: 'b', title: 'Renamed' })
  await manager.props.onRemove('b')
  assert.deepEqual(plain(harness.calls.map(({ route, ...payload }) => payload)), [
    { action: 'superagent.add', workspaceId: 'w1', title: 'New lead' },
    { action: 'superagent.update', id: 'b', title: 'Renamed' },
    { action: 'superagent.remove', id: 'b' },
  ])
  const managementHarness = clientHarness()
  const managementProps = { ...manager.props, selectedId: 'a' }
  let management = managementHarness.render('SuperagentManager', managementProps)
  assert.equal(nodes(management).some(node => node.props.className === 'lsa-agent-popup'), false)
  nodes(management).find(node => node.props.className?.includes('lsa-agent-more')).props.onClick()
  management = managementHarness.render('SuperagentManager', managementProps)
  const remove = nodes(management).find(node => node.type === 'button' && text(node) === 'removeSuperagent')
  assert.equal(remove.props.disabled, true, 'open task blocks remove in UI as well as Host')
})

test('client: visible creation and selected-tab actions replace the old manager; names and Escape are guarded', async () => {
  const harness = clientHarness()
  const board = harness.api.normalizeBoard(fixture)
  board.superagents[1].title = 'Alpha'
  const selected = [], created = []
  const props = { t: translate, board, workspaceId: 'w1', selectedId: 'a', busy: false, onSelect: id => selected.push(id), onRename: async () => true, onAdd: async value => { created.push(value); return true }, onRemove: async () => true }
  let tree = harness.render('SuperagentManager', props)
  const tabs = nodes(tree).filter(node => node.props.className === 'lsa-agent-tab')
  assert.equal(tabs.length, 3)
  assert.match(text(tabs[1]), /Alpha.*Workspace one.*a/s)
  tabs[2].props.onClick()
  assert.deepEqual(selected, ['b'])
  let scrolled
  tabs[2].props.onFocus({ currentTarget: { scrollIntoView: value => { scrolled = value } } })
  assert.deepEqual(plain(scrolled), { block: 'nearest', inline: 'nearest' })
  const more = value => nodes(value).find(node => node.props.className?.includes('lsa-agent-more'))
  const create = value => nodes(value).find(node => node.props.className?.includes('lsa-agent-create'))
  assert.equal(create(tree).props['aria-label'], 'addSuperagent')
  assert.match(text(create(tree)), /createSuperagentShort/)
  assert.equal(nodes(tree).some(node => node.props.className === 'lsa-management'), false)
  assert.equal(nodes(tree).some(node => node.type?.name === 'Icon' && node.props.name === 'settings'), false, 'no duplicate settings gear')
  const selectedGroup = nodes(tree).find(node => node.props.className === 'lsa-agent-option' && nodes(node).includes(more(tree)))
  assert.ok(selectedGroup && nodes(selectedGroup).some(node => node.props['aria-pressed'] === true), 'kebab is beside its selected tab without nesting buttons')
  assert.equal(more(tree).props['aria-expanded'], false)
  more(tree).props.onClick()
  tree = harness.render('SuperagentManager', props)
  const popup = nodes(tree).find(node => node.props.className === 'lsa-agent-popup')
  assert.match(text(popup), /Alpha.*Workspace one.*a/s)
  assert.equal(nodes(tree).find(node => node.props.className === 'lsa-agent-rail').props.children.flat(Infinity).includes(popup), false, 'popup is outside the overflow rail')
  nodes(tree).find(node => node.type === 'button' && text(node) === 'renameSuperagent').props.onClick()
  tree = harness.render('SuperagentManager', props)
  const nameInput = nodes(tree).find(node => node.type === 'input')
  assert.equal(nameInput.props.maxLength, 120)
  assert.equal(nameInput.props.autoFocus, true)
  nameInput.props.onChange({ target: { value: 'x'.repeat(121) } })
  tree = harness.render('SuperagentManager', props)
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(harness.states[3], 'nameRequired')
  let focused = 0
  more(tree).props.ref.current = { focus: () => { focused += 1 } }
  tree.props.onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} })
  tree = harness.render('SuperagentManager', props)
  assert.equal(nodes(tree).some(node => node.props.className === 'lsa-agent-popup'), false)
  assert.equal(focused, 1)

  // Aggregate still exposes creation, but has no rename/delete menu.
  const aggregate = clientHarness()
  const aggregateProps = { ...props, selectedId: '', workspaceId: '' }
  tree = aggregate.render('SuperagentManager', aggregateProps)
  assert.equal(more(tree), undefined)
  create(tree).props.onClick()
  tree = aggregate.render('SuperagentManager', aggregateProps)
  assert.equal(nodes(tree).find(node => node.type === 'select').props.value, '')
  nodes(tree).find(node => node.type === 'select').props.onChange({ target: { value: 'w2' } })
  nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: 'New supervisor' } })
  tree = aggregate.render('SuperagentManager', aggregateProps)
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(plain(created), [{ workspaceId: 'w2', title: 'New supervisor' }])
})

test('client: supervisor removal requires two steps, names the target, and close/scope clear confirmation', async () => {
  const harness = clientHarness()
  const board = harness.api.normalizeBoard({ ...fixture, tasks: [] })
  const removed = []
  const t = key => key === 'confirmSuperagentRemoval' ? 'Remove {name}?' : key
  const props = { t, board, workspaceId: 'w1', selectedId: 'b', busy: false, onRemove: async id => { removed.push(id); return true } }
  const more = value => nodes(value).find(node => node.props.className?.includes('lsa-agent-more'))
  const button = (value, label) => nodes(value).find(node => node.type === 'button' && text(node) === label)
  let tree = harness.render('SuperagentManager', props)
  more(tree).props.onClick()
  tree = harness.render('SuperagentManager', props)
  button(tree, 'removeSuperagent').props.onClick()
  assert.deepEqual(removed, [], 'first click is not destructive')
  tree = harness.render('SuperagentManager', props)
  assert.match(text(tree), /Remove Beta/)
  button(tree, 'cancel').props.onClick()
  tree = harness.render('SuperagentManager', props)
  more(tree).props.onClick()
  tree = harness.render('SuperagentManager', props)
  assert.equal(button(tree, 'confirmRemoveSuperagent'), undefined, 'closing resets the destructive confirmation')
  button(tree, 'removeSuperagent').props.onClick()
  tree = harness.render('SuperagentManager', props)
  await button(tree, 'confirmRemoveSuperagent').props.onClick()
  assert.deepEqual(removed, ['b'])
})

test('client: closed composer has no placeholder or duplicate CTA and reopening retains its local draft', () => {
  const harness = clientHarness()
  const board = harness.api.normalizeBoard(fixture)
  const props = { t: translate, workspaces: board.workspaces, superagents: board.superagents, defaultWorkspaceId: 'w1', defaultSuperagentId: 'a', busyKey: '', open: true }
  let tree = harness.render('TaskComposer', props)
  nodes(tree).find(node => node.type === 'input' && node.props.id === 'lsa-task-title').props.onChange({ target: { value: 'Unsaved title' } })
  nodes(tree).find(node => node.type === 'textarea' && node.props.id === 'lsa-task-goal').props.onChange({ target: { value: 'Unsaved goal' } })
  assert.equal(harness.render('TaskComposer', { ...props, open: false }), null)
  tree = harness.render('TaskComposer', props)
  assert.equal(nodes(tree).find(node => node.type === 'input' && node.props.id === 'lsa-task-title').props.value, 'Unsaved title')
  assert.equal(nodes(tree).find(node => node.type === 'textarea' && node.props.id === 'lsa-task-goal').props.value, 'Unsaved goal')
  assert.equal(nodes(tree).filter(node => node.type === 'button' && text(node).includes('newTaskShort')).length, 0)

  const page = pageHarness('w1', 'a')
  let pageTree = page.render('Page', { t: translate })
  const composer = component(pageTree, 'TaskComposer')
  assert.equal(composer.props.open, false, 'Page keeps the composer mounted when closed')
  const entry = component(pageTree, 'TaskEntry')
  assert.ok(entry && component(entry, 'TaskComposer'), 'entry retains the mounted composer without a closed placeholder')
  assert.ok(nodes(pageTree).indexOf(component(pageTree, 'SuperagentManager')) < nodes(pageTree).indexOf(entry))
  assert.ok(nodes(pageTree).indexOf(entry) < nodes(pageTree).indexOf(component(pageTree, 'AttentionPanel')))
  const header = clientHarness().render('Topbar', component(pageTree, 'Topbar').props)
  assert.equal(nodes(header).filter(node => node.type === 'button' && node.props['aria-label'] === 'newTaskShort').length, 0)
  const entryDOM = clientHarness().render('TaskEntry', entry.props)
  assert.equal(nodes(entryDOM).filter(node => node.type === 'button' && node.props['aria-label'] === 'newTaskShort').length, 1)
  entry.props.onOpen()
  pageTree = page.render('Page', { t: translate })
  assert.equal(component(pageTree, 'TaskComposer').props.open, true)
  let focused = 0
  component(pageTree, 'TaskEntry').props.buttonRef.current = { focus: () => { focused += 1 } }
  component(pageTree, 'TaskComposer').props.onToggle()
  pageTree = page.render('Page', { t: translate })
  assert.equal(component(pageTree, 'TaskComposer').props.open, false)
  assert.equal(focused, 1, 'closing returns focus to the task entry below Superagent')
  const keyBefore = component(pageTree, 'SuperagentManager').props.key
  component(pageTree, 'SuperagentManager').props.onSelect('b')
  pageTree = page.render('Page', { t: translate })
  assert.notEqual(component(pageTree, 'SuperagentManager').props.key, keyBefore, 'scope change discards stale management edit and confirmation state')
})

test('client: the task entry is unique even on empty scopes and aggregate requires an explicit owner', () => {
  for (const tasks of [[], fixture.tasks]) {
    const harness = clientHarness()
    harness.states.push(harness.api.normalizeBoard({ ...fixture, tasks, settingsScope: 'global' }))
    const tree = harness.render('Page', { t: translate })
    assert.equal(nodes(tree).filter(node => node.type?.name === 'TaskEntry').length, 1)
    const entry = component(tree, 'TaskEntry')
    const entryDOM = clientHarness().render('TaskEntry', entry.props)
    assert.equal(nodes(entryDOM).filter(node => node.type === 'button' && node.props['aria-label'] === 'newTaskShort').length, 1)
    const headerDOM = clientHarness().render('Topbar', component(tree, 'Topbar').props)
    assert.equal(nodes(headerDOM).some(node => node.props['aria-label'] === 'newTaskShort'), false)
    assert.equal(component(tree, 'TaskComposer').props.defaultSuperagentId, '')
    assert.equal(component(tree, 'TaskComposer').props.defaultWorkspaceId, '')
    const empty = component(tree, 'EmptyState')
    if (empty) assert.equal(empty.props.action, undefined, 'empty scope does not add another task CTA')
  }
  assert.match(clientHarness().api.dictionaries.en.workspaceEmptyHint, /above/)
  assert.match(clientHarness().api.dictionaries.zh.workspaceEmptyHint, /上方/)
  assert.match(source, /case 'settings_scope_changed'/)
})

test('client: compact model labels preserve full identity in tooltips', () => {
  const harness = clientHarness()
  const model = { provider: 'a-long-provider', model: 'namespace/a-very-long-model-name-for-running-tasks-and-review' }
  assert.ok(harness.api.shortModelLabel(model).length <= 28)
  const tree = harness.render('TaskCard', { t: translate, now: 0, task: { ...fixture.tasks[0], workerModel: model, superagentTitle: 'Alpha' } })
  const label = nodes(tree).find(node => node.props.className === 'lsa-card-model')
  assert.ok(label.props.title.includes(model.provider + '/' + model.model))
  assert.ok(text(label).length <= 28)
})

test('client: autonomy controls enforce integer bounds and worker-empty copy means inheritance', async () => {
  const harness = clientHarness()
  const settings = harness.api.normalizeSettings({ models: { supervisor: { provider: 'p', model: 'alpha' } } })
  const saves = []
  const props = { t: translate, id: 'settings', scopeTitle: 'Alpha', settings, busyKey: '', onSave: value => saves.push(value) }
  let tree = harness.render('SettingsPopover', props)
  const minuteInput = nodes(tree).find(node => node.type === 'input' && node.props.id === 'lsa-autonomy-minutes')
  assert.deepEqual([minuteInput.props.min, minuteInput.props.max, minuteInput.props.step], [1, 1440, 1])
  minuteInput.props.onChange({ target: { value: '0' } })
  tree = harness.render('SettingsPopover', props)
  nodes(tree).find(node => node.type === 'button' && text(node).trim() === 'save').props.onClick()
  assert.equal(saves.length, 0)
  assert.equal(harness.states[1], 'waitInvalid')
  nodes(tree).find(node => node.type === 'input' && node.props.id === 'lsa-autonomy-minutes').props.onChange({ target: { value: '45' } })
  tree = harness.render('SettingsPopover', props)
  nodes(tree).find(node => node.type === 'button' && text(node).trim() === 'save').props.onClick()
  assert.deepEqual(plain(saves), [{ autonomy: { enabled: false, waitMinutes: 45 } }])
  const { en, zh } = harness.api.dictionaries
  assert.match(en.workerModelsHint, /inherit the globally configured Superagent model/)
  assert.match(zh.workerModelsHint, /继承全局 Superagent 模型/)
  assert.match(en.autonomyHint, /original authorization/)
  assert.match(zh.autonomyHint, /不能绕过登录、付款/)
  assert.match(source, /prefers-reduced-motion/)
  assert.match(source, /@container lsaboard/)
})
