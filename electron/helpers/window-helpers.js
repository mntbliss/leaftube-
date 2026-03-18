import { join, resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { Path } from '../constants/path.js'

/**
 * icon path for window icon
 * packaged: use process.resourcesPath so it works for both portable and NSIS install
 */
export function getIconPath(app, rootDirPath) {
    if (!app.isPackaged) return resolve(rootDirPath, Path.BUILD_DIR, Path.ICON_FILENAME)
    const appRoot = dirname(app.getPath('exe'))
    const candidates = [
        join(process.resourcesPath, Path.BUILD_DIR, Path.ICON_FILENAME),
        join(process.resourcesPath, Path.ICON_FILENAME),
        join(appRoot, Path.BUILD_DIR, Path.ICON_FILENAME),
    ]

    for (const path of candidates) {
        if (existsSync(path)) return path
    }
    return candidates[0]
}

/**
 * shared window options for all windows
 */
export function getTransparentFrameOptions(isAcrylic) {
    const useAcrylic = Boolean(isAcrylic)
    return {
        frame: false,
        transparent: true,
        roundedCorners: !useAcrylic,
        backgroundColor: '#00000000',
        backgroundMaterial: useAcrylic ? 'acrylic' : 'none',
    }
}

/**
 * shared web preferences for all windows
 */
export function getWebPreferences(options = {}) {
    const { preloadPath, partition } = options
    const prefs = {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
    }
    if (preloadPath) prefs.preload = preloadPath
    if (partition) prefs.partition = partition
    return prefs
}
