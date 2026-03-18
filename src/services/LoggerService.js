let cachedIsRelease = false

export function init(settings, isRelease) {
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
    try {
        const reportError = window?.desktopBridge?.logs?.reportError
        if (typeof reportError === 'function') {
            const stack = error && typeof error === 'object' && error.stack ? error.stack : null
            const errMsg = stack ? `${String(message)}\n${stack}` : String(message)
            // logs buffer lives in main process
            reportError(errMsg).catch(() => {})
        }
    } catch {}
}
