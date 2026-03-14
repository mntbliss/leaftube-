
export function trimText(text, maxSize, maxCap = 128) {
    const str = typeof text === 'string' ? text : ''
    const limit = Number.isFinite(maxSize) && maxSize > 0 ? Math.min(maxSize, maxCap) : 36
    return str.length <= limit ? str : `${str.slice(0, limit)}…`
}
