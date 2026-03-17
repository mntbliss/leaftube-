export function trimText(text, maxSize, maxCap = 128) {
    const textString = typeof text === 'string' ? text : ''
    const limit = Number.isFinite(maxSize) && maxSize > 0 ? Math.min(maxSize, maxCap) : 36
    return textString.length <= limit ? textString : `${textString.slice(0, limit)}…`
}
