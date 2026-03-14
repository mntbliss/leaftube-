let cachedSettings = null
let cachedIsRelease = false

export function init(settings, isRelease) {
    if (settings != null) cachedSettings = settings
    if (isRelease !== undefined) cachedIsRelease = Boolean(isRelease)
}

export function error(...args) {
    if (!cachedIsRelease) console.error(...args)
}

export function log(...args) {
    if (!cachedIsRelease) console.log(...args)
}

export function warn(...args) {
    if (!cachedIsRelease) console.warn(...args)
}

export function debug(...args) {
    if (!cachedIsRelease) console.debug(...args)
}

export function errorDump(message, error) {
    error(message, error)
}
