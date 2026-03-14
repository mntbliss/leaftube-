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
    }
    if (preloadPath) prefs.preload = preloadPath
    if (partition) prefs.partition = partition
    return prefs
}

