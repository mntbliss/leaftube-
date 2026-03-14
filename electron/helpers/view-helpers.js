import { BrowserView } from 'electron'

export function isValidView(view) {
    return view && view instanceof BrowserView
}

/**
 * run custom js in a BrowserView webContents
 * returns a promise when done
 */
export function runScriptInView(view, script) {
    if (!isValidView(view)) return Promise.resolve()
    return view.webContents.executeJavaScript(script)
}

/**
 * run custom js in a BrowserView webContents
 * returns result or fallbeck on error
 */
export async function runScriptInViewReturn(view, script, fallback = null) {
    if (!isValidView(view)) return fallback
    try {
        const result = await view.webContents.executeJavaScript(script)
        return result !== undefined && result !== null ? result : fallback
    } catch {
        return fallback
    }
}
