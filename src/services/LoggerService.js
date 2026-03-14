let cachedSettings = null

export function init(settings) {
    cachedSettings = settings
}

export function log(...args) {
    console.log(...args)
}

export function warn(...args) {
    console.warn(...args)
}

export function debug(...args) {
    console.debug(...args)
}

export function errorDump(message, error) {
    console.error(message, error)
}
