/** in-memory error buffer for main process. */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BUFFER_SIZE = 1000 // max amount of errors to buffer

const buffer = []

function toLocalTimeString(date) {
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

function normalizeError(payload) {
    if (payload instanceof Error) {
        return { message: payload.message ?? String(payload), stack: payload.stack ?? '' }
    }
    const message = payload?.message ?? (typeof payload === 'string' ? payload : String(payload))
    const stack = payload?.stack ?? ''
    return { message, stack }
}

export function addError(errorOrReason) {
    const now = new Date()
    const { message, stack } = normalizeError(errorOrReason)
    buffer.push({ message, stack, time: toLocalTimeString(now) })
    if (buffer.length > BUFFER_SIZE) {
        buffer.shift()
    }
}

export function getLastForSave() {
    const count = Math.min(BUFFER_SIZE, buffer.length)
    if (count === 0) return []
    return buffer.slice(-count)
}

export function formatEntriesForFile(entries) {
    const lines = []
    for (const e of entries) {
        lines.push(`💔 | [${e.time}] | ${e.message}`)
        lines.push(`✏️ | Stack trace: ${e.stack || '(none)'}`)
    }
    return lines
}

/**
 * save latest errors to a .log file in the given app directory (e.g. folder containing the exe).
 * @param {string} appDirectory - Directory to write the log file into
 * @returns {{ ok: true, path: string } | { ok: false, error: string, path: null }}
 */
export function saveToFile(appDirectory) {
    const entries = getLastForSave()
    const lines = formatEntriesForFile(entries)
    const now = new Date()
    const dateLocalized = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const filePath = join(appDirectory, `${dateLocalized}.log`)
    writeFileSync(filePath, lines.join('\n'), 'utf8')
    return { ok: true, path: filePath }
}
