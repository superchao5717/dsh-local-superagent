/** Small shared helpers for the Local Superagent Host half. */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const now = () => Date.now()

/** Short unique task id, e.g. `sa-1a2b3c4d`. */
export const taskId = () => `sa-${randomUUID().replace(/-/g, '').slice(0, 8)}`

export const clamp = (text, max) => {
  const value = typeof text === 'string' ? text.trim() : ''
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

/** Keep the newest `max` entries of a chronological log array. */
export const keepNewest = (list, max) => (list.length > max ? list.slice(list.length - max) : list)

/** Read JSON, returning `fallback` when the file is absent or unreadable. */
export async function readJson(file, fallback, log = () => {}) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') log(`could not read ${file}: ${String(error)}`)
    return fallback
  }
}

/** Write JSON atomically (temp file + rename) so a crash never leaves half a ledger. */
export async function writeJsonAtomic(file, value) {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${randomUUID().slice(0, 6)}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, file)
}

/** Promise-based sleep used only for bounded retry gaps. */
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

/** Format epoch ms as a local ISO-like timestamp for logs. */
export const stamp = ms => new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
