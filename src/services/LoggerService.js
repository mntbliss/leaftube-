let cachedSettings = null

export function init(settings) {
    cachedSettings = settings
}

function devConsoleEnabled() {
    return Boolean(cachedSettings?.developer?.enableDeveloperConsole)
}

export function log(...args) {
    if (!devConsoleEnabled()) return
    console.log(...args)
}

export function warn(...args) {
    if (!devConsoleEnabled()) return
    console.warn(...args)
}

export function debug(...args) {
    if (!devConsoleEnabled()) return
    console.debug(...args)
}

export function errorDump(message, error) {
    console.error(message, error)
}
